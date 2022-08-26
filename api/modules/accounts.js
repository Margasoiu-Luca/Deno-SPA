
/* accounts.js */

import { compare, genSalt, hash } from 'https://deno.land/x/bcrypt@v0.2.4/mod.ts'
import { db } from './db.js'

const saltRounds = 10
const salt = await genSalt(saltRounds)

export async function login(credentials) {
	const { user, pass } = credentials
	let sql = `SELECT count(id) AS count FROM accounts WHERE user="${user}";`
	let records = await db.query(sql)
	if(!records[0].count) throw new Error(`username "${user}" not found`)
	sql = `SELECT pass FROM accounts WHERE user = "${user}";`
	records = await db.query(sql)
	const valid = await compare(pass, records[0].pass)
	if(valid === false) throw new Error(`invalid password for account "${user}"`)
	return user
}

export async function register(credentials) {
	let sql = `SELECT count(id) AS count FROM accounts WHERE user="${credentials.user}";`
	let records = await db.query(sql)
	console.log(`hello2 ${records[0].count==true}`)
	if(records[0].count) throw new Error(`username "${credentials.user}" already used`)
	else{
		credentials.pass = await hash(credentials.pass, salt)
		const sql2 = `INSERT INTO accounts(user, role, pass) VALUES("${credentials.user}","user", "${credentials.pass}")`
		await db.query(sql2)
		const sql3 = `SELECT * FROM accounts WHERE user="${credentials.user}"`
		records = await db.query(sql3)
		return records[0]
	}
}
export async function verifyRole(user){
	let sql = `SELECT (role) FROM accounts WHERE user="${user}"`
	let records = await db.query(sql)
	if(!(records[0].role=='user'||records[0].role=='admin')){
		throw new Error("User is not authorised to do this action")
	}
	else{
		return records[0].role
	}
}

export async function getUser(name){
	let sql = `SELECT * FROM accounts WHERE user="${name}"`
	let records = await db.query(sql)
	return records

}