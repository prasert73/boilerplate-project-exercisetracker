const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const db = process.env['MONGO_URI'];
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
mongoose.connect(db, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});

const userSchema = new mongoose.Schema({
  username: {type: String, unique: true}
});
const userModel = mongoose.model('user', userSchema);

const exSchema = new mongoose.Schema({
  userid: String,
  username: String,
  description: String,
  duration: Number,
  date: Date
});

const exModel = mongoose.model('excercise_record', exSchema);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req,res)=>{
  const {username} = req.body;
  const createNewUser = new userModel({username: username});
  createNewUser.save((error,data)=>{
    if (error) {
      res.send("username already taken");
    } else {
    res.json({username: data.username, _id: data._id});
  }
  });
});

app.get('/api/users', (req,res)=>{
  userModel.find({}, (error,result)=>{
    res.json(result);
  });
});

app.post('/api/users/:_id/exercises', (req,res)=>{
  const userid = req.params._id;
  let {description, duration, date} = req.body;
  if (!date) {date = new Date();};
  duration = Number(duration);
  date = new Date(date);
  userModel.findById({_id: userid}, (error,data)=>{
    let username = data.username;  
    if (!data) {
      res.send("unknown userid");
    } else {
      const addExcercise = new exModel({userid, username, description, duration, date});
      addExcercise.save((error,data)=>{
         res.json({_id: userid, username, date: date.toDateString(), duration, description })
      });
    }
  }); 
});

app.get('/api/users/:_id/logs', (req,res)=>{
  const userid = req.params._id;
  let {from, to , limit} = req.query;
  limit = Number(limit);
  let filter = {userid};
  let dateFilter = {};
  if (from) {
    dateFilter["$gte"] = new Date(from);
  };
  if (to) {
    dateFilter["$lte"] = new Date(to);
  };
  if (from || to) {
    filter.date = dateFilter;
  };
  userModel.findById({_id: userid},(error,data)=>{
    let username = data.username;
    if (!data) {
      res.send('unknown userid');
    } else {      
        exModel.find(filter)
                .limit(limit)
               .select({_id: 0, userid: 0, username: 0, __v: 0})
              .exec((error,data)=>{
                    let log = data.map((date)=> ({
                      description: date.description, 
                      duration: date.duration, 
                      date: date.date.toDateString()
                    }));
                    res.json({_id: userid, username: username, count: data.length, log})
      });
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
