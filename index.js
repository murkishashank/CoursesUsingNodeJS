const express = require('express')
const app = express()
const port = 3000
const mysql = require('mysql');
var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "tecnics"
})

connection.connect(function(err) {
	if (err) throw err;
})

app.get('/api/course', (request, response) => {
	connection.query("SELECT id, Title, Description, Tags FROM Syllabus WHERE UserID = 5002 AND Status = 1", (error, result, fields) => {
		if (error) throw error
		response.json(result)
	})
})

app.get('/api/syllabus/:id', (request, response) => {
	connection.query(mysql.format("SELECT id, Title, Description, Tags FROM Syllabus WHERE Status = 1 AND id = ?", [request.params.id]), (error, result, fields) => {
		if (error) throw error
		response.json(result)
	})
})

app.post('/api/syllabus', (request, response) => {
	const title = request.body.title;
	const description = request.body.description;
	const tags = request.body.tags;
	if (title.length != 0 && description.length != 0 && tags != 0) {
		const sql = "INSERT INTO Syllabus(UserID, Title, Description, Tags, Status) VALUES (?, ?, ?, ?, 1)";
		const values = [request.body.UserID, title , description, tags];
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
		if (result.length > 0) {
			connection.query(mysql.format("UPDATE Syllabus SET Title = ?, Description = ?, Tags = ? WHERE id = ?", [request.body.title, request.body.description, request.body.tags, id]), (error, result, fields) => {
				if(error) throw error
				response.status(200)
				connection.query(mysql.format("SELECT id, Title, Description, Tags FROM Syllabus WHERE id = ?", [id]), (error, result, fields) => {
					response.json(result)
				})
			})
		}
		else {
			response.status(404);
			response.send("Failed to Update.")
		}
	})
})

app.delete('/api/syllabus/:id', (request, response) => {
	const id = request.params.id;
	connection.query(mysql.format("SELECT id FROM Syllabus WHERE Status = 1 AND id = ?", [id]), (error, result, fields) => {
		if (result.length > 0) {
			connection.query(mysql.format("UPDATE Syllabus SET Status = 0 WHERE id = ?", [id]), (error, result, fields) => {
				if(error) throw error
				response.status(204)
			})
		}
		else {
			response.sendStatus(404)
			response.send("Failed to delete")
		}
	})
})

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`)
})