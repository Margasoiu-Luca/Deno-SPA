import { db } from './db.js'

export async function addEvent(data) {
    //Mysql sees "" as not null. Because of that manual checks must be made to make sure that the values are not null
    for (const temp in data){
        console.log(data[temp])
        if(data[temp]==""){
            throw new Error(`Value for "${temp}" is not defined`)
        }
    }
    try{
        const sql = `INSERT INTO event(title, image_b64, happening_on, description, added_on, acc_name)VALUES("${data.title}",
            "${data.image_b64}", 
            "${data.happening_on}",
            "${data.description}",
            "${data.added_on}",
            "${data.user}")`
		console.log(sql)
		await db.query(sql)
        const sql2 = `SELECT id FROM event`
        let idOfAdded = await db.query(sql2)
        idOfAdded = idOfAdded[(idOfAdded.length)-1].id
        return {id:idOfAdded,status:"success"}
    }
    catch(err){
        return err.message
    }
}

export async function getEvent(id){
    try{
        if(isNaN(parseInt(id))||isNaN(id)){
            return `${id} is not a valid event id`
        }
        else{
            const sql = `SELECT * FROM event WHERE id =${id}`
            const res = await db.query(sql)
            console.log(res==true)
            if(res.length!=0){
                console.log(res)
                return res
            }
            else{
                return `no event with id ${id}`
            }
        }
    }
    catch(err){
        return err.message
    }
}
export async function getAllEvents(){
    const sql = `SELECT id,title,image_b64,happening_on,acc_name FROM event`
    const res = await db.query(sql)
    return res
}

export async function getEventsFromAcc(user){
    const sql = `SELECT * FROM event where acc_name="${user}"`
    const res =  await db.query(sql)
    return res

}