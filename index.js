const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql');
// const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult} = require('express-validator');
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

connection.connect(function(err) {
	if (err) throw err
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
			var token = {"token":result[0].Token};
		}
		response.status(status).json(token);
	})
})

function validateToken(request, response, next) {
	const token = request.headers.authorization;
	if(token == null || token == undefined) {
		response.status(401).json({"error":"unauthorized."});
	}
	else {
		request.token = token;
		next();
	}
}

function getUserIDfromtoken(request, response, next) {
	const query = "SELECT UserID FROM Users WHERE Token = ?";
	const values = [request.token];
	connection.query(mysql.format(query, values), (error, result, fields) => {
		if(result.length <= 0) {
			response.status(401).json({"error":"unauthorized."})
		}
		else {
			request.userid = result[0].UserID;
			next();
		}
	})
}

app.use(validateToken);
app.use(getUserIDfromtoken);

app.get('/api/course', (request, response) => {
	const userid = request.userid;
	const query = "SELECT id, Title, Description, Tags FROM Syllabus WHERE UserID = ? AND Status = 1";
	const values = [userid];
	connection.query(mysql.format(query, values), (error, result, fields) => {
		if (error) throw error;
		response.status(200).json(result);  
	})  
})

app.get('/api/syllabus/:id', (request, response) => {
	var id = request.params.id;
	var userid = request.userid;
	checkID(id, response, result => {
		getSyllabusItem(id, userid, response, (result) => {
			response.status(200).json(result);
		})
	})
})

app.post('/api/syllabus', (request, response) => {
	var userid = request.userid;
	const title = request.body.title;
	const description = request.body.description;
	const tags = request.body.tags;
	if (title.length != 0 && description.length != 0 && tags.length != 0) {
		const query = "INSERT INTO Syllabus(UserID, Title, Description, Tags, Status) VALUES (?, ?, ?, ?, 1)";const values = [userid, title , description, tags];
		connection.query(mysql.format(query, values), function (error, result, fields) {
			getSyllabusItem(result.insertId, userid, response, result => {
				console.log(result);
				response.status(201).json(result);
			})
		})
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
		checkID(id, userid, response, result => {
			connection.query(mysql.format(query, values), (error, result, fields) => {
				getSyllabusItem(id, userid, response, result => {
					response.status(201).json(result);
				})
			})
		})
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
	checkID(id, response, result => {
		const query = "UPDATE Syllabus SET Status = 0 WHERE id = ?";
		const value = [id, userid];
		connection.query(mysql.format(query, value), (error, result, fields) => {
			connection.query(mysql.format("SELECT id, Title, Description, Tags FROM Syllabus WHERE id = ? AND Status = 1 AND UserID = ?", [id, userid]), (error, result, fields) => {
				response.status(200).send(result);
			})
		})
	})
})

function checkID(id, response, callback) {
	const query = "SELECT id FROM Syllabus WHERE id = ?";
	const values = [id];
	connection.query(mysql.format(query, values), (error, result, fields) => {
		if(error) throw error;
		if(result.length <= 0) {
			response.status(404).json({"error":"Invalid id."});
		}
		else {
			callback(result);
		}
	})
}

function getSyllabusItem(id, userid, response, callback) {
	const query = "SELECT id, Title, Description, Tags FROM Syllabus WHERE id = ? AND Status = 1 AND UserID = ?";
	const values = [id, userid];
	connection.query(mysql.format(query, values), (error, result, fields) => {
		if(error) throw error;
		if(result.length <= 0) {
			console.log(result + "OK");
			response.status(403).json({"error":"Unauthorized."});
		}
		else {
			callback(result);
		}
	})
}

app.listen(port, () => {
	console.log(`Listening at http://localhost:${port}`)
})