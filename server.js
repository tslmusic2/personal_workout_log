import http from 'node:http'
import { pool } from './utilities/database.js'
import { getRequestBody } from './utilities/getRequestBody.js'
import { sendJson } from './utilities/responses.js'
import { isValidISODate } from './utilities/isValidIsoDate.js'

const PORT = 8006


const ADMIN_API_KEY = process.env.ADMIN_API_KEY
if (!ADMIN_API_KEY) {
     throw new Error('ADMIN_API_KEY is missing')
}



const result = await pool.query(`
    SELECT current_database() AS database_name;
`)

console.log('Connected to database:', result.rows[0].database_name)

const server = http.createServer(async (req, res) => {

     //Here so this works on my local network----------
	res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE OPTIONS')

      if (req.method === 'OPTIONS') {
      res.statusCode = 204
      return res.end()
      }
	//-------------------------------------------------

    try {


        //-----------------GET HANDLER-----------------------

        if (req.url === '/api/savedworkouts' && req.method === 'GET') {

            const result = await pool.query(`
                SELECT * FROM workouts
                ORDER BY workout_date DESC, id DESC;
                `)


            const savedWorkouts = result.rows

            return sendJson(res, 200, savedWorkouts)
        }




        if (req.url.startsWith('/api/savedworkouts') && req.method === 'DELETE') {

            //----------------------------------------------------------//
			if (!ADMIN_API_KEY || req.headers['x-admin-key'] !== ADMIN_API_KEY) {
				return sendJson(res, 403, { message: 'Admin access required' })
			}
			//----------------------------------------------------------//


            const id = Number(req.url.split('/').pop())

            if (!Number.isInteger(id) || id < 1) {
                return sendJson(res, 400, {message: 'id must be a positive integer'})
            }

            const result = await pool.query(`
                DELETE FROM workouts 
                    WHERE id = $1;
                `, [id])


            if (result.rowCount === 0) {
                return sendJson(res, 404, {message: 'item id could not be found'})
            }


            return sendJson(res, 200, {message: `workout deleted successfully`})
        }




        if (req.url === '/api/savedworkouts' && req.method === 'POST') {

            //----------------------------------------------------------//
			if (!ADMIN_API_KEY || req.headers['x-admin-key'] !== ADMIN_API_KEY) {
				return sendJson(res, 403, { message: 'Admin access required' })
			}
			//----------------------------------------------------------//

            let parsedReqBody
            try {

                parsedReqBody = await getRequestBody(req)

                if (parsedReqBody === null || typeof parsedReqBody !== 'object' || Array.isArray(parsedReqBody)) {
                    return sendJson(res, 400, {message: 'Request body must be a JSON object'})
                }

                
                
                
            } catch(err) {

                if(err instanceof SyntaxError) {
                    return sendJson(res, 400, {message: 'Request body must contain valid JSON'})
                }

                    throw err
            }

            const requiredFields = ['workout_type', 'length_minutes', 'workout_date']
            const allowedFields = ['workout_type', 'length_minutes', 'description', 'workout_date', 'workout_time']

            const reqBodyFields = Object.keys(parsedReqBody)

            for (const field of requiredFields) {
                const includesField = reqBodyFields.includes(field)

                if (!includesField) {
                    return sendJson(res, 400, {message: `${field} is a required field`})
                }
            }


            for (const field of reqBodyFields) {
                const allowedField = allowedFields.includes(field)

                if (!allowedField) {
                    return sendJson(res, 400, {message: `Request includes an unallowed field`})
                }


            }



            //workout_type,
            if (
                parsedReqBody.workout_type === null || 
                typeof parsedReqBody.workout_type !== 'string' || 
                parsedReqBody.workout_type.trim().length === 0
                ) {
                return sendJson(res, 400, {message: 'workout_type must be a non null string'})
            }

            // length_minutes, 
            if (
                parsedReqBody.length_minutes === null || 
                !Number.isInteger(parsedReqBody.length_minutes) || 
                parsedReqBody.length_minutes < 1 ||
                parsedReqBody.length_minutes > 2147483647
                ) {
                return sendJson(res, 400, {message: 'length_minutes must be an integer between 1 and 2147483647'})
            }

            // description, 
            const hasDescription = Object.hasOwn(parsedReqBody, 'description')
            if(hasDescription) {
                if (
                    parsedReqBody.description !== null && (
                        typeof parsedReqBody.description !== 'string' || 
                        parsedReqBody.description.trim().length === 0
                        )
                    ) {
                    return sendJson(res, 400, {message: 'description must be a non empty string or null'})
                }
            }

            // workout_date, 
            if (!isValidISODate(parsedReqBody.workout_date)) {
                return sendJson(res, 400, {message: 'workout_date must be a valid date in YYYY-MM-DD format'})
            }

            // workout_time,  
            const hasWorkoutTime = Object.hasOwn(parsedReqBody, 'workout_time')
            if (hasWorkoutTime) {
                if (parsedReqBody.workout_time !== null && (
                        typeof parsedReqBody.workout_time !== 'string' ||
                        !/^([01]\d|2[0-3]):[0-5]\d$/.test(parsedReqBody.workout_time)
                    )
                ) {
                    return sendJson(res, 400, {message: 'workout_time must use HH:MM format from 00:00 to 23:59, or be null'})
                }
            }


            const insertFields = reqBodyFields.join(', ')
            const placeholderValues = reqBodyFields.map((key, index) => `$${index + 1}`).join(', ')
            const getValues = Object.values(parsedReqBody)

            const result = await pool.query(`
                INSERT INTO workouts (
                    ${insertFields}
                ) VALUES (
                    ${placeholderValues}
                )
                `, getValues)

            
            return sendJson(res, 201, {message: 'item successfully added'})

        }



        if(req.url.startsWith('/api/savedworkouts') && req.method === 'PATCH') {


            //----------------------------------------------------------//
			if (!ADMIN_API_KEY || req.headers['x-admin-key'] !== ADMIN_API_KEY) {
				return sendJson(res, 403, { message: 'Admin access required' })
			}
			//----------------------------------------------------------//



            let parsedReqBody
            try {

                parsedReqBody = await getRequestBody(req)

                if (parsedReqBody === null || typeof parsedReqBody !== 'object' || Array.isArray(parsedReqBody)) {
                    return sendJson(res, 400, {message: 'Request must be a JSON object'})
                }
            
            } catch(err) {

                if(err instanceof SyntaxError) {
                    return sendJson(res, 400, {message: 'Request body must contain valid JSON'})
                }

                    throw err
            }
            

            const reqKeys = Object.keys(parsedReqBody)

            if (reqKeys.length === 0) {
				return sendJson(res, 400, { message: 'Provide at least one field to update' })
			}

            const allowedFields = ['workout_type', 'length_minutes', 'description', 'workout_date', 'workout_time']

            for (const field of reqKeys) {
                const hasField = allowedFields.includes(field)

                if (!hasField) {
                    return sendJson(res, 400, {message: `${field} is not an allowed field`})
                }
            }

            const hasWorkoutType = Object.hasOwn(parsedReqBody, 'workout_type')
            if(hasWorkoutType) {
                if (
                    parsedReqBody.workout_type === null || 
                    typeof parsedReqBody.workout_type !== 'string' || 
                    parsedReqBody.workout_type.trim().length === 0
                )
                    return sendJson(res, 400, {message: 'Workout_type must be a non null string'})
            }


            const hasLengthMinutes = Object.hasOwn(parsedReqBody, 'length_minutes')
            if (hasLengthMinutes) {
                if (!Number.isInteger(parsedReqBody.length_minutes) || 
                    parsedReqBody.length_minutes < 1 ||
                    parsedReqBody.length_minutes > 2147483647
                )
                    return sendJson(res, 400, {message: 'Length_minutes must be a number between 1 and 2147483647'})
            }


            const hasDescription = Object.hasOwn(parsedReqBody, 'description')
            if (hasDescription) {
                if (
                    parsedReqBody.description !== null &&
                    (typeof parsedReqBody.description !== 'string' || 
                        parsedReqBody.description.trim().length === 0)
                    )
                    return sendJson(res, 400, {message: 'Description must be a non empty string or null'})
            }



            const hasWorkoutDate = Object.hasOwn(parsedReqBody, 'workout_date')
            if (hasWorkoutDate) {
                if (!isValidISODate(parsedReqBody.workout_date)) {
                    return sendJson(res, 400, {message: 'workout_date must be a valid date in YYYY-MM-DD format'})
                }
            }


            const hasWorkoutTime = Object.hasOwn(parsedReqBody, 'workout_time')
            if (hasWorkoutTime) {
                if (parsedReqBody.workout_time !== null && (
                        typeof parsedReqBody.workout_time !== 'string' ||
                        !/^([01]\d|2[0-3]):[0-5]\d$/.test(parsedReqBody.workout_time)
                    )
                ) {
                    return sendJson(res, 400, {message: 'workout_time must use HH:MM format from 00:00 to 23:59, or be null'})
                }
            }



            const id = Number(req.url.split('/').pop())

            if (!Number.isInteger(id) || id <= 0 || id > 2147483647) {
                return sendJson(res, 400, {message: 'id must be a valid number between 1 and 2147483647'})
            }

            const updateFields = reqKeys.map((field, index) => `${field} = $${index + 1}`)


            const values = Object.values(parsedReqBody)
            values.push(id)

            const result = await pool.query(`
                UPDATE workouts
                    SET ${updateFields.join(', ')}
                WHERE id = $${values.length}
                RETURNING *;
                `, values)
                                            // SET  field = $1 if more , field = $2
                                            // WHERE id = $3
                                            //so ideally pass in an array [$1 value, $2 value, $3 id]


            if (result.rowCount === 0) {
                return sendJson(res, 404, {message: 'id not found'})
            }

            return sendJson(res, 200, {message: `Workout updated successfully`, workout: result.rows[0]})


        }




        return sendJson(res, 404, {message: 'the url requested could not be found'})


    } catch(err) {
        console.error(err)
        return sendJson(res, 500, {message: 'Internal Server Error'})

    }






})

server.listen(PORT, () => console.log(`Connected on port: ${PORT}`))