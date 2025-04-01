const pool = require("../db");

async function createUser(nome, email, senha) {
    const result = await pool.query(
        "INSERT INTO users (nome, email, senha) VALUES ($1, $2, $3) RETURNING *",
        [nome, email, senha]
    );
    return result.rows[0];
}

async function getUserByEmail(email) {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    return result.rows[0];
}

module.exports = { createUser, getUserByEmail };

