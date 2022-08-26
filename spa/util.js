



/* util.js */

export function showMessage(message, delay = 3000) {
	console.log(message)
	document.querySelector('aside p').innerText = message
	document.querySelector('aside').classList.remove('hidden')
	setTimeout( () => document.querySelector('aside').classList.add('hidden'), delay)
}

/* NAV FUNCTIONS */

export function loadPage(page) {
	history.pushState(null, null, `/${page}`)
	triggerPageChange()
}

export async function triggerPageChange() {
	console.log('pageChange')
	const page = getPageName()
	console.log(`trying to load page: ${page}`)
	// get a reference to the correct template element
	const template = document.querySelector(`template#${page}`) ?? document.querySelector('template#home')
	const node = template.content.cloneNode(true) // get a copy of the template node
	try {
		const module = await import(`./js/${page}.js`)
		await module.setup(node) // the setup script may need to modify the template fragment before it is displayed
	} catch(err) {
		console.warn(`no script for "${page}" page or error in script`)
		console.log(err)
	}
	// replace contents of the page with the correct template
	const article = document.querySelector('article')
	while (article.lastChild) article.removeChild(article.lastChild) // remove any content from the article element
	article.appendChild(node) // insert the DOM fragment into the page
	highlightNav(page)
	article.id = page
}

function getPageName() {
	console.log(window.location.pathname)
	const path = window.location.pathname.replace('/', '')
	let page = path ? path : 'home'
	console.log(`page: ${page}`)
	return page
}

export function highlightNav(page) {
	document.querySelectorAll('nav li').forEach(element => {
		const link = element.querySelector('a').href.replace(`${window.location.origin}/`, '') || 'home'
		if(link === page) {
			element.classList.add('currentpage')
		} else {
			element.classList.remove('currentpage')
		}
	})
	document.querySelector('nav').style.visibility = 'visible'
}

export function customiseNavbar(items) {
	document.querySelectorAll('nav li').forEach(element => {
		const link = element.querySelector('a').href.replace(`${window.location.origin}/`, '') || 'home'
		if(items.includes(link)) {
			element.style.display = 'block'
		} else {
			element.style.display = 'none'
		}
	})
	
}

/* FUNCTIONS USED IN FORMS */

export function createToken(username, password) {
	const token = btoa(`${username}:${password}`)
	return `Basic ${token}`
}

export function file2DataURI(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

/* FUNCTIONS TO MAKE API CALLS
 * all API calls support the JSON:API specification */

export async function secureGet(url, token) {
	console.log('secure get')
	const options = {
		method: 'GET',
		headers: {
			'Authorization': token,
			'Content-Type': 'application/vnd.api+json',
			'Accept': 'application/vnd.api+json'
		}
	}
	console.log(options)
	const response = await fetch(url, options)
	const json = await response.json()
	return { status: response.status, json: json }
}

