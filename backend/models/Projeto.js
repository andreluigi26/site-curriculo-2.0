const mongoose = require('mongoose');

const projetoSchema = new mongoose.Schema({
    githubRepoId: { type: Number, unique: true, sparse: true },
    githubRepoName: String,
    titulo: String,
    descricao: String,
    tecnologias: [String],
    linkProjeto: String,
    linkGithub: String,
    destaque: {type: Boolean, default: false}
});

module.exports = mongoose.model('Projeto', projetoSchema);