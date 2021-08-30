const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, query} = require('express-validator');
var passwordValidator = require('password-validator');
var schema = new passwordValidator();
schema
.is().min(6)
.is().max(30)
.has().uppercase()
.has().lowercase()
.has().digits(1)
.has().symbols(1)
.has().not().spaces()
const { request, response } = require('express');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

var connection = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "",
	database: "tecnics"
})

function validateToken(request, response, next) {
	const path = request.path;
	if(path == "/api/login" || path == "/api/signup") {
		next();
	}
	else {
		const token = request.headers.authorization;
		if(token == null || token == undefined) {
			response.status(401).json({"error":"unauthorized."});
		}
		else {
			request.token = token;
			next();
		}
	}
}

function getUserIDfromtoken(request, response, next) {
	const path = request.path;
	if(path == "/api/login" || path == "/api/signup") {
		next();
	}
	else {
		const token = request.token;
		const query = "SELECT UserID FROM Users WHERE Token = ?";
		const values = [token]
		connection.query(mysql.format(query, values), (error, result, fields) => {
			if(result.length <= 0) {
				response.status(401).json({"error":"unauthorized."})
			}
			else {
				const userid = result[0].UserID;
				request.userid = result[0].UserID;
				next();
			}
		})
	}
}

app.use(validateToken);
app.use(getUserIDfromtoken);

function checkID(id, response) {
	const checkIDPromise = new Promise((resolve, reject) => {
		const query = "SELECT id FROM Syllabus WHERE id = ?";
		const values = [id];
		connection.query(query, values, (error, result, fields) => {
			if(error) reject(error);
			if(result.length > 0) {
				resolve(result);
			}
			else {
				response.status(404).json({"error":"Invalid id."})
			}
		})
	})
	return checkIDPromise;
}

function promiseSyllabusItem(id, userid, response) {
	const syllabusItemPromise = new Promise((resolve, reject) => {
		const query = "SELECT id, Title, Description, Tags FROM Syllabus WHERE Status = 1 AND id = ? AND UserID = ?";
		const values = [id, userid];
		connection.query(mysql.format(query, values), (error, result, fields) => {
			if(error) reject(error);
			if(result.length > 0) {
				resolve(result);
			}
			else {
				response.status(403).json({"error":"No Access."})
			}
		})
	})
	return syllabusItemPromise;
}

function promiseQuery(query, values, response) {
	const queryPromise = new Promise((resolve, reject) => {
		connection.query(mysql.format(query, values), (error, result, fields) => {
			if(error) reject(error);
			resolve(result);
		})
	})
	return queryPromise;
}

app.get('/api/course', (request, response) => {
	console.log("Passed.")
	const userid = request.userid;
	const query = "SELECT id, Title, Description, Tags FROM Syllabus WHERE UserID = ? AND Status = 1";
	const values = [userid]
	promiseQuery(query, values, response)
	.then(result => response.json(result))
	.catch(console.log)
})

app.get('/api/syllabus/:id', (request, response) => {
	var id = request.params.id;
	var userid = request.userid;
	checkID(id, response)
	.then(result => {
		return promiseSyllabusItem(id, userid, response);
	})
	.then(result => response.json(result))
	.catch(console.log)
	.then(() => connection.end())
})

app.post('/api/syllabus', (request, response) => {
	var userid = request.userid;
	const title = request.body.title;
	const description = request.body.description;
	const tags = request.body.tags;
	if (title.length != 0 && description.length != 0 && tags.length != 0) {
		const query = "INSERT INTO Syllabus(UserID, Title, Description, Tags, Status) VALUES (?, ?, ?, ?, 1)";const values = [userid, title , description, tags];
		promiseQuery(query, values)
		.then((error, result, fields) => {
			const id = result.insertId;
			return promiseSyllabusItem(id, userid, response);
		})
		.then(result => response.status(201).json(result))
		.catch(console.log)
		.then(() => connection.end())
	}
	else {
		const errorData = {};
		if(title.length <= 0) {
			errorData.titleerror = "Title is required.";
		}
		if(description.length <= 0) {
			errorData.descriptionerror = "Description is required.";
		}
		if(tags.length <= 0) {
			errorData.tagserror = "Tags are required.";
		}
		response.status(400).json(errorData);
	}
})

app.put('/api/syllabus/:id', (request, response) => {
    const id = request.params.id
	const userid = request.userid;
	const title = request.body.title;
	const description = request.body.description;
	const tags = request.body.tags;
	if (title.length != 0 && description.length != 0 && tags.length != 0) {
		const query = "UPDATE Syllabus SET Title = ?, Description = ?, Tags = ? WHERE id = ? AND UserID = ?";
		const values = [title, description, tags, id, userid];
		checkID(id, response)
		.then(result => {
			return promiseQuery(query, values, response)
		})
		.then(result => {
			return promiseSyllabusItem(id, userid, response);
		})
		.then(result => response.json(result))
		.catch(console.log)
		.then(() => connection.end())
	}
	else {
		const errorData = {};
		if(title.length <= 0) {
			errorData.titleerror = "Title is required.";
		}
		if(description.length <= 0) {
			errorData.descriptionerror = "Description is required.";
		}
		if(tags.length <= 0) {
			errorData.tagserror = "Tags are required.";
		}
		response.status(400).json(errorData);
	}
})

app.delete('/api/syllabus/:id', (request, response) => {
    const id = request.params.id;
	const userid = request.userid;
	checkID(id, response)
	.then(result => {
		return promiseQuery("UPDATE Syllabus SET Status = 0 WHERE id = ? AND UserID = ?", [id, userid], response);
	})
	.then(result => {
		return promiseSyllabusItem(id, userid, response);
	})
	.then(result => response.json(result))
	.catch(console.log)
	.then(() => connection.end())
})

app.post('/api/signup', [
	body('userName').notEmpty().withMessage('User Name is required'),
	body('email').isEmail().withMessage("Please enter a valid Email-ID."),
], (request, response) => {
	const errors = validationResult(request)
	if (!errors.isEmpty()) {
		return response.status(400).json({ errors: errors.array()})
	}
	const userName = request.body.userName;
	const email = request.body.email;
	const password = request.body.password;
	const token = uuidv4();
	if(schema.validate(password)) {
		const query = "INSERT INTO Users(UserName, EmailID, Password, Token) VALUES (?, ?, ?, ?)";
		const values = [userName, email, password, token];
		connection.query(mysql.format(query, values), (error, result, fields) => {
			if (error) throw error;
			response.status(201);
			response.json({"token":token});
		})
	}
	else {
		response.status(400);
		response.json({"error":"Please Enter a Valid Password. Password must contain atleast one lowercase, uppercase and a special character."});
	}
})

app.post('/api/login', (request, response) => {
	const email = request.body.email;
	const password = request.body.password;
	const sql = "SELECT Token FROM Users WHERE EmailID = ? AND Password = ?";
	const values = [email, password]
	connection.query(mysql.format(sql, values), (error, result, fields) => {
		if (error) throw error;
		var status = 400;
		var token = {"error":"Invalid Credentials."};
		if(result.length > 0) {
			var status = 200;
			var token = result[0].Token;
			var token = {"token":token};
		}
		response.status(status).json(token);
	})
})

app.listen(port, () => {
	console.log(`Listening at http://localhost:${port}`)
})