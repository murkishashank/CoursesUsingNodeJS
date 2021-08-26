const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql');
// const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, header } = require('express-validator');
const { request } = require('express');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var connection = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "tecnics"
});

connection.connect(function(err) {
	if (err) throw err;
})

app.get('/api/course', (request, response) => {
	connection.query("SELECT id, Title, Description, Tags FROM Syllabus WHERE UserID = 5002 AND Status = 1", (error, result, fields) => {
		if (error) throw error
		console.log(result[0].Title);
		response.json(result);
	})
})

app.get('/api/syllabus/:id', (request, response) => {
	connection.query(mysql.format("SELECT id, Title, Description, Tags FROM Syllabus WHERE Status = 1 AND id = ?", [request.params.id]), (error, result, fields) => {
		if (error) throw error
		response.json(result);
	})
})

app.post('/api/syllabus', (request, response) => {
	const title = request.body.title;
	const description = request.body.description;
	const tags = request.body.tags;
	if (title.length != 0 && description.length != 0 && tags != 0) {
		const sql = "INSERT INTO Syllabus(UserID, Title, Description, Tags, Status) VALUES (5002, ?, ?, ?, 1)";
		const values = [title , description, tags];
		connection.query(mysql.format(sql, values), function (error, result, fields) {
			if (error) throw error
			response.status(201)
			connection.query(mysql.format("SELECT id, Title, Description, Tags FROM Syllabus WHERE id = ?", [result.insertId]), (error, result, fields) => {
				response.json(result)
			})
		})
	}
	else {
		response.status(400)
		response.json({"error":"Invalid in Input."})
	}
})

app.put('/api/syllabus/:id', (request, response) => {
	const id = request.params.id
	connection.query(mysql.format("SELECT id FROM Syllabus WHERE Status = 1 AND id = ?", [id]), (error, result, fields) => {
		if (result.length <= 0) {
			response.status(404);
			response.json({"error":"Invalid id."});
			response.end();
		}
		connection.query(mysql.format("UPDATE Syllabus SET Title = ?, Description = ?, Tags = ? WHERE id = ?", [request.body.title, request.body.description, request.body.tags, id]), (error, result, fields) => {
			if(error) throw error
			response.status(200)
			connection.query(mysql.format("SELECT id, Title, Description, Tags FROM Syllabus WHERE id = ?", [id]), (error, result, fields) => {
				response.json(result);
			})
		})
	})
})

app.delete('/api/syllabus/:id', (request, response) => {
	const id = request.params.id;
	connection.query(mysql.format("SELECT id FROM Syllabus WHERE Status = 1 AND id = ?", [id]), (error, result, fields) => {
		if (result.length <= 0) {
			response.status(404);
			response.json({"error":"Failed to delete"});
			response.end();
		}
		connection.query(mysql.format("UPDATE Syllabus SET Status = 0 WHERE id = ?", [id]), (error, result, fields) => {
			if(error) throw error
			connection.query(mysql.format("SELECT * FROM Syllabus WHERE Status = 1 AND id = ?", [id]), (error, result, fields) => {
				response.send(result)
			})
		})
	})
	response.end();
})
  

app.post('/signup', [
	body('userName').notEmpty().withMessage('User Name is required'),
	body('email').isEmail().withMessage("Please enter a valid Email-ID."),
	body('password').isLength({min:6}).withMessage('Password Must Contain at least 6 characters.')
], (request, response) => {
	const errors = validationResult(request)
	if (!errors.isEmpty()) {
		return response.status(400).json({ errors: errors.array()})
	}
	const userName = request.body.UserName;
	const email = request.body.email;
	const password = request.body.password;
	const token = uuidv4();
	connection.query(mysql.format("INSERT INTO Users(UserName, EmailID, Password, Token) VALUES (?, ?, ?, ?)", [userName, email, password, token]), (error, result, fields) => {
		if (error) throw error;
		response.send(201);
		response.json(result);
	})
})

app.post('/signin', (request, response) => {
	const email = request.body.email;
	const password = request.body.password;
	connection.query(mysql.format("SELECT Token FROM Users WHERE EmailID = ? AND Password = ?", [email, password]), (error, result, fields) => {
		if (error) throw error;
		response.send()
		token = result[0].Token;
		console.log(token);
	})
})


// function getUserID(token) {
// 	var userid;
// 	console.log(token + "token");
// 	connection.query(mysql.format("SELECT UserID FROM Users WHERE Token = ?", [token]), (error, result, fields) => {
// 		userid = result;
// 		console.log(userid);
// 		return userid;
// 	})
// 	console.log("fun", userid);
// }


// app.get('/test', (request, response) => {
// 	 mysql.createConnection({
// 		host: "localhost",
// 		user: "root",
// 		password: "",
// 		database: "tecnics"
// 	}).then(conn=>{
// 		return conn.query("SELECT * FROM Syllabus WHERE Status = 1")
// 	})
// 	.then(result=>{
// 		console.log(result);
// 		response.send(result);
// 	})
// 	.catch(function(error){

// 	})
// })

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
})