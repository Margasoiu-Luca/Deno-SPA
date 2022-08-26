
/* register.js */

import { customiseNavbar, loadPage, showMessage } from '../util.js'

export async function setup(node) {
	try {
		console.log('REGISTER: setup')
		console.log(node)
		document.querySelector('header p').innerText = 'Register an Account'
		customiseNavbar(['home', 'register', 'login'])
		node.querySelector('form').addEventListener('submit', await register)
	} catch(err) { // this will catch any errors in this script
		console.error(err)
	}
}

async function register() {
	event.preventDefault()
	const formData = new FormData(event.target)
	const data = Object.fromEntries(formData.entries())
	console.log(data)
	console.log(JSON.stringify(data))
	const url = '/api/v1/accounts'
	const options = {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	}
	const response = await fetch(url, options)
	if(response.status === 201) {
		const json = await response.json()
		console.log(json+'test')
		showMessage('new account registered')
		loadPage('login')
	} else {
		const json = await response.json()
		console.log(json)
		document.querySelector('input[name="user"]').value = ''
		document.querySelector('input[name="pass"]').value = ''
		showMessage(json.errors[0].detail)
		}
}