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
});

connection.connect(function(err) {
	if (err) throw err;
});

app.get('/api/syllabus', (request, respond) => {
	connection.query("SELECT * FROM Syllabus WHERE UserID = 5002 AND Status = 1", (error, result, fields) => {
		if (error) throw error;
		respond.send(result);
	});
})

app.post('/api/syllabus', (req, res) => {
	connection.query("INSERT INTO Syllabus(UserID, Title, Description, Tags, Status) VALUES (" + req.body.USERID + ", '" + req.body.title + "', '" + req.body.description + "', '" + req.body.tags + "', 1)", function (err, result, fields) {
		if (err) throw err;
		res.status(201);
		res.send(result);
		console.log(result.insertId);
	});
})

app.put('/api/syllabus/:id', (req, res) => {
	id = req.params.id;
	console.log(id);
	connection.query("UPDATE Syllabus SET Title = '" + req.body.title + "', Description = '" + req.body.description + "', Tags = '" + req.body.tags + "' WHERE id = " + id, (err, result, fields) => {
		if(err) throw err;
		res.status(200);
		res.send(result)
	})
})

app.delete('/api/syllabus/:id', (request, respond) => {
	connection.query("UPDATE Syllabus SET Status = 0 WHERE id = " + id, (error, result, fields) => {
		if(error) throw error;
		respond.status(204);
	})
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})

// connection.end()