const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username : {type: 'string', required: true, unique: true}, 
    email : {type: 'string', required: true, unique: true},
    password : {type: 'string', required: true},
    admin : {type: 'boolean'}

})
module.exports = mongoose.model('User',userSchema);