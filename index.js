const express = require('express');
const app = express();
const port = 3000;
const mysql = require('mysql');
// const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult, header } = require('express-validator');
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
	if (err) {
		console.log(err);
		response.status(500);
		response.json({"error":"Database not connected."})
	}
})

app.get('/api/course', (request, response) => {
	var token = request.headers.authorization;
	if(token == null || token == undefined) {
		response.status(401);
		response.json({"error":"Please signin to your account."});
	}
	else {
		getUserID(token, result => {
			if(result.length <= 0) {
				response.status(400);
                response.json({"error":"User Not Found"});
            }
            else {
				var userid = result[0].UserID;
                connection.query(mysql.format("SELECT id, Title, Description, Tags FROM Syllabus WHERE UserID = ? AND Status = 1", [userid]), (error, result, fields) => {
                    if (error) throw error
                    if(result.length <= 0) {
                        response.status(404);
						const result = {"error":"No Records Found."};
                    }
                    response.json(result);
                })
            }
		})
	}
})

app.get('/api/syllabus/:id', (request, response) => {
	const token = request.headers.authorization;
    if(token == null || token == undefined) {
		response.status(401);
		response.json({"error":"Please signin to your account."});
	}
    else {
        getUserID(token, result => {
			if(result.length > 0) {
				var id = request.params.id
				var userid = result[0].UserID;
				getSyllabusItem(id, userid, (result) => {
					if(result.length <= 0) {
						response.status(400);
                        var result = {"error":"Invalid ID. Please enter a valid ID."};
                    }
                    response.json(result);
				})
			}
			else {
				response.status(404);
				response.json({"error":"User not found."});
			}
        });
    }
})

app.post('/api/syllabus', (request, response) => {
    const token = request.headers.authorization;
    if(token == null || token == undefined) {
		response.status(401);
		response.json({"error":"Please signin to your account."});
	}
    else {
        getUserID(token, result => {
			if(result.length <= 0) {
				response.status(404);
				response.json({"error":"User not found."});
			}
			else {
				var userid = result[0].UserID;
				const title = request.body.title;
				const description = request.body.description;
				const tags = request.body.tags;
				if (title.length != 0 && description.length != 0 && tags.length != 0) {
					const sql = "INSERT INTO Syllabus(UserID, Title, Description, Tags, Status) VALUES (?, ?, ?, ?, 1)";
					const values = [userid, title , description, tags];
					connection.query(mysql.format(sql, values), function (error, result, fields) {
						if (!error) {
							response.status(201);
							getSyllabusItem(result.insertId, userid, result => {
								if(result.length <= 0) {
									response.status(500);
									const result = {"error":"Syllabus not iserted."};
								}
								response.json(result);
							})
						}
						else {
							response.status(500);
							response.json({"error":"Something went wrong. Please try again."});
						}
					})
				}
				else {
					response.status(400);
					response.json({"error":"Invalid in Input."});
				}
			}
        })
    }
})

app.put('/api/syllabus/:id', (request, response) => {
    const token = request.headers.authorization;
    if(token == null || token == undefined) {
		response.status(401);
		response.json({"error":"Please signin to your account."});
	}
    else {
        getUserID(token, result => {
            if(result.length <= 0) {
				response.status(404);
				response.json({"error":"User not found."});
			}
			else {
				var userid = result[0].UserID;
				const id = request.params.id
				getSyllabusItem(id, userid, result => {
					if (result.length <= 0) {
						response.status(404);
						response.json({"error":"Invalid id."});
					}
					else {
						console.log(request.body.title);
						connection.query(mysql.format("UPDATE Syllabus SET Title = ?, Description = ?, Tags = ? WHERE id = ? AND UserID = ?", [request.body.title, request.body.description, request.body.tags, id, userid]), (error, result, fields) => {
							if(!error) {
								response.status(200)
								getSyllabusItem(id, userid, result => {
									response.json(result);
								})
							}
							else {
								response.status(500);
								response.json({"error":"Something went wrong. Please try again."});
							}
						})
					}
				})
			}
        })
    }
})

app.delete('/api/syllabus/:id', (request, response) => {
    const token = request.headers.authorization;
    if(token == null || token == undefined) {
		response.status(401);
		response.json({"error":"Please signin to your account."});
	}
    else {
        getUserID(token, result => {
            if(result.length <= 0) {
				var userid = result[0].UserID;
				const id = request.params.id;
				getSyllabusItem(id, userid, result => {
					if (result.length <= 0) {
						response.status(404);
						response.json({"error":"Invalid id."});
						response.end();
					}
					else{
						connection.query(mysql.format("UPDATE Syllabus SET Status = 0 WHERE id = ?", [id]), (error, result, fields) => {
							if(!error) {;
								getSyllabusItem(id, userid, result => {
									response.status(200);
									response.send(result);
								})
							}
							else {
								response.status(500);
								response.send({"error":"Something went wrong. Please try again."});
							}
						})
					}
				})
			}
		})
    }
})
  

app.post('/signup', [
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
		connection.query(mysql.format("INSERT INTO Users(UserName, EmailID, Password, Token) VALUES (?, ?, ?, ?)", [userName, email, password, token]), (error, result, fields) => {
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

app.post('/signin', (request, response) => {
	const email = request.body.email;
	const password = request.body.password;
	connection.query(mysql.format("SELECT Token FROM Users WHERE EmailID = ? AND Password = ?", [email, password]), (error, result, fields) => {
		if (error) throw error;
		var token = result[0].Token;
		if(result.length <= 0 ) {
			var token = {"error":"Invalid Credentials."};
		}
		response.json({"token":token})
	})
})


function getUserID(token, callback) {
	console.log(token + "token");
	connection.query(mysql.format("SELECT UserID FROM Users WHERE Token = ?", [token]), (error, result, fields) => {
		if(error) throw error;
		callback(result);
	})
}

function getSyllabusItem(id, userid, callback) {
	connection.query(mysql.format("SELECT id, Title, Description, Tags FROM Syllabus WHERE id = ? AND Status = 1 AND UserID = ?", [id, userid]), (error, result, fields) => {
		if(error) throw error;
		callback(result);
	})
}

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