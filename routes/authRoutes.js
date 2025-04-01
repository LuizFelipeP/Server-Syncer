import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db.js"; // Certifique-se de que está apontando para a conexão correta
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

// Rota de Login
router.post("/login", async (req, res) => {
  const { email, senha } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Credenciais inválidas!" });
    }

    const usuario = result.rows[0];
    console.log(usuario);

    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ error: "Credenciais inválidas!" });
    }

    const token = jwt.sign(
        { id: usuario.id, email: usuario.email },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ token, userId: usuario.id });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});


// Rota de Registro
router.post("/register", async (req, res) => {
  const { email, username, password } = req.body;

  // Validação simples de dados
  if (!email || !username || !password) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  try {
    // Verificar se o email já está registrado
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length > 0) {
      return res.status(409).json({ error: "Email já registrado!" });
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserir o novo usuário no banco de dados
    await pool.query(
        "INSERT INTO users (nome, email, senha) VALUES ($1, $2, $3)",
        [username, email, hashedPassword]
    );

    res.status(201).json({ message: "Usuário registrado com sucesso!" });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});




export default router;
