
import { extractCredentials, saveFile,checkValidAuthToken } from './modules/util.js'
import { login, register,getUser, verifyRole } from './modules/accounts.js'
import {addEvent,getEvent,getAllEvents,getEventsFromAcc} from './modules/events.js'

import { Router,helpers } from 'https://deno.land/x/oak@v6.5.1/mod.ts'


const apiRouter = new Router({ 
  prefix: "/api/v1"
})


apiRouter.get("/", (ctx) => {
  console.log("api");
  ctx.response.body = "Hello world!";
});








//Login
apiRouter.get('/accounts', async context => {
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.headers.set('accepts','GET, POST')
	console.log('GET /api/accounts')
	const token = context.request.headers.get('Authorization')
	console.log(`auth: ${token}`)
	try {
		const credentials = extractCredentials(token)
		console.log(credentials)
		const username = await login(credentials)
		console.log(`username: ${username}`)
		context.response.body = JSON.stringify(
			{
				data: { username }
			}, null, 2)
	} catch(err) {
		context.response.status = 401
		context.response.body = JSON.stringify(
			{
				errors: [
					{
						status:'401',
						title: 'Unauthorized.',
						detail: err.message
					}
				]
			}
		, null, 2)
	}
})






//Register
apiRouter.post('/accounts', async context => {
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.headers.set('accepts','GET, POST')
	const JSONschema={
		"type":"account",
		attributes:{
			user:"string",
			pass:"string"
		}
    }
	if(context.request.headers.get('content-type')!=="application/vnd.api+json"){
		context.response.status = 415
		context.response.body = JSON.stringify({
			errors: [
				{	
					status:'415',
					title: 'Unsupported Media Type',
					detail: "Only the following content-type is accepted: application/vnd.api+json"
				}
			]
		})
	}
	else{
		try{
			
			console.log('POST /api/accounts')
			const body  = await context.request.body()
			const data = await body.value
			if(JSONschema.type!==data.type|| !('user' in data.attributes) || !('pass' in data.attributes) || Object.keys(JSONschema).length!==Object.keys(data).length ||
			Object.keys(JSONschema.attributes).length!==Object.keys(data.attributes).length){
				context.response.status = 415
				context.response.body = JSON.stringify({
					errors: [
						{	
							status:'400',
							title: 'Bad request',
							detail: "The request made did not contain the correct data structure"
						}
					],
					"JSONschema":JSONschema
				})
			}
				else{
					console.log(data.attributes)
					const acc = await register(data.attributes)
					context.response.headers.set('location',`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${data.attributes.user}`)
					context.response.status = 201
					context.response.body = JSON.stringify({
						"data": {
							"type": "account",
							"id": acc.id,
							"attributes": {
								"user": acc.user,
								"role": acc.role,
								"pass": acc.pass
							},
							"links": {
								"self": `https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${data.attributes.user}`
							}
						}
					})
				}
		}
		catch(err) {
			context.response.status = 401
			context.response.body = JSON.stringify(
				{
					errors: [
						{
							status:'409',
							title: 'Conflict in resource creation',
							detail: err.message
						}
					]
				}
			, null, 2)

		}
	}
})






//get account info
//Only admins are able to do this
apiRouter.get('/accounts/:name', async context =>{
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.headers.set('accepts','GET')
	if(context.request.headers.get('content-type')!=="application/vnd.api+json"){
		context.response.status = 415
		context.response.body = JSON.stringify({
			errors: [
				{	
					status:'415',
					title: 'Unsupported Media Type',
					detail: "Only the following content-type is accepted: application/vnd.api+json"
				}
			]
		})
	}	
	else{
		let role = ''
		try{
			const {user,pass} = await extractCredentials(context.request.headers.get('Authorization'))
			role = await verifyRole(user)
			console.log("role")
		}
		catch(err){
			console.log("hello2")
			role="non-valid"
			context.response.status = 401
			context.response.body = JSON.stringify({
				errors: [
					{	
						status:'401 Unautharized',
						title: 'Non-valid auth header',
						detail: err.message
					}
				]
			})
		}


		if(role!=='admin' && role!=="non-valid"){
			context.response.status = 401
			context.response.body = JSON.stringify({
				errors: [
					{	
						status:'401',
						title: 'Unautharized',
						detail: "Only administrators are allowed to do this action"
					}
				]
			})
		}
		else{
			if(role!=="non-valid"){
					const { name } = helpers.getQuery(context, { mergeParams: true })
					let account = await getUser(name)
					console.log(account)
					if (account.length===0){
						context.response.status=400		
						context.response.body = JSON.stringify({
							errors: [
								{	
									status:'400 Bad Request',
									title: 'No user found',
									detail:`Account with username "${name}" does not exist`
								}
							]
						})
					}
					else{
						context.response.status=200
						context.response.body = JSON.stringify({
							"data": {
								"type": "accounts",
								"id": account[0].id,
								"attributes": {
									"role":`${account[0].role}`,
									"user":`${account[0].user}`,
									"pass":`${account[0].pass}`
								},
								"links": {
									"self": `https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${name}`,
									"events":`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${name}/events`
								}
							}
						})
					}
			}
		}
	}
})

//get events from account
apiRouter.get('/accounts/:name/events', async context =>{
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.headers.set('accepts','GET')
	let username = ''
	const { name } = helpers.getQuery(context, { mergeParams: true })
    	if(context.request.headers.get('content-type')!=="application/vnd.api+json"){
		context.response.status = 415
		context.response.body = JSON.stringify({
			errors: [
				{	
					status:'415',
					title: 'Unsupported Media Type',
					detail: "Only the following content-type is accepted: application/vnd.api+json"
				}
			]
		})
	}
    else{
       try{
            username = await checkValidAuthToken(context.request.headers.get('Authorization'))
            let events = await getEventsFromAcc(name)
            console.log(events.length)
            if(events.length==0){
                context.response.status=200	
                context.response.body = JSON.stringify({
                    information: [
                        {	
                            status:'200',
                            title: 'Successful request but no data found',
                            detail:`No events created by account with username ${name} have been found`
                        }
                    ]
                })
            }
            
            else{
                let dataArray=[]
                events.map( x =>{
                    dataArray=[...dataArray, 
                        {
                            "type":"Event",
                            "id": x.id,
                            "attributes": {
                                "title": x.title,
                                "image_b64": x.image_b64,
                                "happening_on": x.happening_on,
                                "description": x.description,
                                "added_on": x.added_on,
                                "acc_name": x.acc_name
                            },
                            relationships:{
                                acc_name:{
                                    links:{
                                        "self":`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${name}`
                                    },
                                    data:{
                                        type:"Account",id:name
                                    }
                                }
                            },
                            "links": {
                                "self": `https://legacy-fresh-8080.codio-box.uk/api/v1/events/${x.id}`
                            }
                        }
                    ]
                })
                context.response.status=200
                context.response.body = JSON.stringify({
                    "data": [dataArray
                    ],
                    "links": {
                        "self": `https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${name}/events`,
                        "related":`https://legacy-fresh-8080.codio-box.uk/api/v1/events`
                    }
                })
            }
        }
        catch(err){
            context.response.status = 401
            context.response.body = JSON.stringify({
                errors: [
                    {	
                        status:'401 Unautharized',
                        title: 'Non-valid auth header',
                        detail: err.message
                    }
                ]
            })
        }
 
    }
        
})

//Unused


// apiRouter.post('/files', async context => {
// 	console.log('POST /api/files')
// 	try {
// 		const token = context.request.headers.get('Authorization')
// 		console.log(`auth: ${token}`)
// 		const body  = await context.request.body()
// 		const data = await body.value
// 		console.log(data)
// 		saveFile(data.base64, data.user)
// 		context.response.status = 201
// 		context.response.body = JSON.stringify(
// 			{
// 				data: {
// 					message: 'file uploaded'
// 				}
// 			}
// 		)
// 	} catch(err) {
// 		context.response.status = 400
// 		context.response.body = JSON.stringify(
// 			{
// 				errors: [
// 					{	
// 						status:'400',
// 						title: 'a problem occurred',
// 						detail: err.message
// 					}
// 				]
// 			}
// 		)
// 	}
// })


apiRouter.post('/events', async context =>{
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.headers.set('accepts','GET, POST')
	console.log(context.request.headers.get('content-type'))
	if(context.request.headers.get('content-type')!=="application/vnd.api+json"){
		context.response.status = 415
		context.response.body = JSON.stringify({
			errors: [
				{	
					status:'415',
					title: 'Unsupported Media Type',
					detail: "Only the following content-type is accepted: application/vnd.api+json"
				}
			]
		})
	}
	else{
		let username = ''
		const JSONschema= {
			"type": "event",
			"attributes": {
				"title":"string",
				"image_b64":"base64 encoded image",
				"happening_on":"YYYY-MM-DD HH:MM:SS",
				"description":"string"
			}

		}
		try{
			console.log("hello1")
			username = await checkValidAuthToken(context.request.headers.get('Authorization'))
			console.log("username is "+username)
			const r = await context.request.body()
			let data = await r.value

			//Some really wierd thing forces me to individually compare the keys
			if(Object.keys(JSONschema).length==Object.keys(data).length && Object.keys(JSONschema.attributes).length==Object.keys(data.attributes).length &&
			'type' in data && 'title' in data.attributes && 'image_b64' in data.attributes && 'happening_on' in data.attributes && 'description' in data.attributes){
					data.attributes.added_on = new Date().toISOString().slice(0, 19).replace('T', ' ')
					data.attributes.user=username
					console.log(JSON.stringify(data, undefined, 2));
					const attemptedAdd = await addEvent(data.attributes)
					//if attemptedAdd exists it  means that attemptedAdd did not succed
					console.log(attemptedAdd.status)
					if(!(attemptedAdd.status)){
						context.response.status=400
						context.response.body = JSON.stringify({
							errors: [
								{	
									status:'409',
									title: 'Conflict in resource creation',
									detail: attemptedAdd
								}
							],
							"JSONschema":JSONschema
						})

					}
					else{
						context.response.status=201
						context.response.headers.set('location',`https://legacy-fresh-8080.codio-box.uk/api/v1/events/${attemptedAdd.id}`)
						context.response.body =JSON.stringify(
							{
								data:{
									"type":"Event",
									"id": attemptedAdd.id,
									"attributes": {
										"title": data.attributes.title,
										"image_b64": data.attributes.image_b64,
										"happening_on": data.attributes.happening_on,
										"description": data.attributes.description,
										"added_on": data.attributes.added_on,
										"acc_name": data.attributes.user
									},
									relationships:{
										acc_name:{
											links:{
												"self":`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${data.attributes.user}`,
												"events":`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${data.attributes.user}/events`
											},
											data:{
												type:"Account",id:data.attributes.user
											}
										}
									},
									
								},
								"links": {
									"self": `https://legacy-fresh-8080.codio-box.uk/api/v1/events/${attemptedAdd.id}`
								}
							}, null, 2)
					}
			}
			else{
				context.response.status=400
				context.response.body = JSON.stringify({
					errors: [
						{	
							status:'400',
							title: 'Bad request',
							detail: "The request made did not contain the correct data structure"
						}
					],
					"JSONschema":JSONschema
				})
			}
		}
		catch(err){
			context.response.status = 401
			context.response.body = JSON.stringify({
				errors: [
					{	
						status:'401 Unautharized',
						title: 'Non-valid auth header',
						detail: err.message
					}
				]
			})
		}
	}


})




apiRouter.get('/events', async context =>{
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.headers.set('accepts','GET, POST')
	console.log(context.request.headers.get('content-type'))
	if(context.request.headers.get('content-type')!=="application/vnd.api+json"){
		context.response.status = 415
		context.response.body = JSON.stringify({
			errors: [
				{	
					status:'415',
					title: 'Unsupported Media Type',
					detail: "Only the following content-type is accepted: application/vnd.api+json"
				}
			]
		})
	}
	else{
		let username = ''
		let data = []
		try{
			username = await checkValidAuthToken(context.request.headers.get('Authorization'))
			context.response.status = 200
			const events = await getAllEvents()
			events.map( x =>{
				data=[...data, 
					{
						"type":"Event (partial information)",
						"id": x.id,
						"attributes": {
							"title": x.title,
							"image_b64": x.image_b64,
							"happening_on": x.happening_on,
							"acc_name": x.acc_name
						},
						relationships:{
							acc_name:{
								links:{
									"self":`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${x.acc_name}`,
									"events":`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${x.acc_name}/events`
								},
								data:{
									type:"Account",id:x.acc_name
								}
							}
						},
						"links": {
							"self": `https://legacy-fresh-8080.codio-box.uk/api/v1/events/${x.id}`
						}
					}
				]
			})
			context.response.body = JSON.stringify({
				data,
				"links": {
					"self": `https://legacy-fresh-8080.codio-box.uk/api/v1/events`
				}
			})
		}
        catch(err){
            context.response.status = 401
            context.response.body = JSON.stringify({
                errors: [
                    {	
                        status:'401 Unautharized',
                        title: 'Non-valid auth header',
                        detail: err.message
                    }
                ]
            })
        }
	}


})



apiRouter.get('/events/:id', async context =>{
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.headers.set('accepts','GET')
	let username = ''
	const { name } = helpers.getQuery(context, { mergeParams: true })
	if(context.request.headers.get('content-type')!=="application/vnd.api+json"){
		context.response.status = 415
		context.response.body = JSON.stringify({
			errors: [
				{	
					status:'415',
					title: 'Unsupported Media Type',
					detail: "Only the following content-type is accepted: application/vnd.api+json"
				}
			]
		})
	}
    else{
		let username = ''
		const { id } = helpers.getQuery(context, { mergeParams: true })
		try{
			username = await checkValidAuthToken(context.request.headers.get('Authorization'))
			const event = await getEvent(id)
			if (typeof(event) === 'string' || event instanceof String){
				context.response.status = 415
				context.response.body = JSON.stringify({
					errors: [
						{	
							status:'400',
							title: 'Bad request',
							detail: event
						}
					]
				})
			}
			else{
				context.response.status = 200
				console.log(event[0])
				context.response.body = JSON.stringify({
					"data":{
						"type":"Event",
						"id": event[0].id,
						"attributes": {
							"title": event[0].title,
							"image_b64": event[0].image_b64,
							"happening_on": event[0].happening_on,
							"description": event[0].description,
							"added_on": event[0].added_on,
							"acc_name": event[0].acc_name
						},
						relationships:{
							acc_name:{
								links:{
									"self":`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${event[0].acc_name}`,
									events:`https://legacy-fresh-8080.codio-box.uk/api/v1/accounts/${event[0].acc_name}/events`
								},
								data:{
									type:"Account",id:event[0].acc_name
								}
							}
						},
						"links": {
							"self": `https://legacy-fresh-8080.codio-boevent.uk/api/v1/events/${event[0].id}`
						}
					}
				})
			}
		}
		catch(err){
			context.response.status = 401
			context.response.body = JSON.stringify({
                errors: [
                    {	
                        status:'401 Unautharized',
                        title: 'Non-valid auth header',
                        detail: err.message
                    }
                ]
            })
		}
	}
	
})







apiRouter.post("/(.*)", async context => {
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.status = 404
	context.response.body = JSON.stringify({
			errors: [
				{	
					status:'404',
					title: 'Not Found',
					detail: "POST method does not exist"
				}
			]
	})
})
apiRouter.get("/(.*)", async context => {
	context.response.headers.set('content-type','application/vnd.api+json')
	context.response.status = 404
	context.response.body = JSON.stringify({
			errors: [
				{	
					status:'404',
					title: 'Not Found',
					detail: "GET method does not exist"
				}
			]
	})
})

export default apiRouter