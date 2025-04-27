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
  const { email, username, password, familia } = req.body;

  if (!email || !username || !password || !familia) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios!" });
  }

  try {
    // Verificar se o email já está registrado
    const userResult = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (userResult.rows.length > 0) {
      return res.status(409).json({ error: "Email já registrado!" });
    }

    // Verificar se a família já existe
    let familiaResult = await pool.query("SELECT id FROM familias WHERE nome = $1", [familia]);
    let familiaId;

    if (familiaResult.rows.length === 0) {
      // Se não existe, cria uma nova família
      const novaFamilia = await pool.query(
          "INSERT INTO familias (nome) VALUES ($1) RETURNING id",
          [familia]
      );
      familiaId = novaFamilia.rows[0].id;
    } else {
      // Se já existe, pega o id dela
      familiaId = familiaResult.rows[0].id;
    }

    // Criptografar a senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Inserir o novo usuário já atrelado à família
    await pool.query(
        "INSERT INTO users (nome, email, senha, familia_id) VALUES ($1, $2, $3, $4)",
        [username, email, hashedPassword, familiaId]
    );

    res.status(201).json({ message: "Usuário registrado com sucesso!" });
  } catch (error) {
    console.error("Erro no registro:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});



// Rota para editar informações do usuário
router.put("/update-user", async (req, res) => {
  const { userId, nome, email, senha } = req.body;

  if (!userId || !nome || !email) {
    return res.status(400).json({ error: "Campos obrigatórios ausentes." });
  }

  try {
    let query = "UPDATE users SET nome = $1, email = $2";
    const params = [nome, email];

    // Se o usuário quiser atualizar a senha também
    if (senha) {
      const hashedPassword = await bcrypt.hash(senha, 10);
      query += ", senha = $3 WHERE id = $4";
      params.push(hashedPassword, userId);
    } else {
      query += " WHERE id = $3";
      params.push(userId);
    }

    await pool.query(query, params);

    res.json({ message: "Informações atualizadas com sucesso!" });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
});




export default router;
