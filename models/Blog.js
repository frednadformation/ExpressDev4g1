const mongoose = require('mongoose')

const blogSchema = mongoose.Schema({
    titre : {type: 'String'},
    sousTitre : {type: 'String'},
    auteur : {type: 'String'},
    description: {type: 'String'}
})

module.exports = mongoose.model('Blog', blogSchema);