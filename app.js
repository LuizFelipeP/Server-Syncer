import express from "express";
import cors from "cors";
import pg from "pg";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import * as Y from "yjs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

//Rotas
app.use("/api/auth", authRoutes); // Adiciona a rota de autenticação


// Rota para buscar os gastos do usuário
// app.get("/api/gastos", async (req, res) => {
//   const userId = req.query.userId;
//
//   if (!userId) {
//     return res.status(400).json({ error: "O userId é obrigatório" });
//   }
//
//   try {
//     const result = await pool.query("SELECT * FROM gastos WHERE user_id = $1", [userId]);
//     res.json(result.rows);
//   } catch (error) {
//     console.error("Erro ao buscar gastos:", error);
//     res.status(500).json({ error: "Erro ao buscar gastos" });
//   }
// });


// Rota para sincronizar gastos usando Yjs
app.post("/api/sync", async (req, res) => {
  const { stateVector, familiaId } = req.body;

  if (!stateVector || !familiaId) {
    return res.status(400).json({ error: "stateVector ou familiaId não fornecido." });
  }

  try {
    const clientVector = new Uint8Array(Buffer.from(stateVector, "base64"));
    let yjsDoc = new Y.Doc();

    const result = await pool.query("SELECT yjs_updates FROM yjs_state WHERE familia_id = $1", [familiaId]);

    if (result.rows.length > 0) {
      const storedUpdates = result.rows[0].yjs_updates;
      storedUpdates.forEach((update) => {
        Y.applyUpdate(yjsDoc, new Uint8Array(update));
      });
    }

    const missingUpdates = Y.encodeStateAsUpdate(yjsDoc, clientVector);

    res.json({ success: true, update: Buffer.from(missingUpdates).toString("base64") });
  } catch (error) {
    console.error("❌ Erro ao sincronizar Yjs:", error);
    res.status(500).json({ error: "Erro ao sincronizar Yjs." });
  }
});


// Salvar updates recebidos do cliente
app.post("/api/update", async (req, res) => {
  const { update, familiaId } = req.body;

  if (!update || !familiaId) {
    return res.status(400).json({ error: "update ou familiaId não fornecido." });
  }

  try {
    const updateBuffer = new Uint8Array(Buffer.from(update, "base64"));

    await pool.query(
        `INSERT INTO yjs_state (familia_id, yjs_updates) 
       VALUES ($1, ARRAY[$2]::bytea[]) 
       ON CONFLICT (familia_id) DO UPDATE 
       SET yjs_updates = array_append(yjs_state.yjs_updates, $2)`,
        [familiaId, Buffer.from(updateBuffer)]
    );

    res.json({ success: true });
  } catch (error) {
    console.error("❌ Erro ao salvar update:", error);
    res.status(500).json({ error: "Erro ao salvar update." });
  }
});




app.get('/api/user', async (req, res) => {
  try {
    const userId = parseInt(req.query.id, 10);  // Supondo que o ID do usuário venha da query string
    if (!userId) {
      return res.status(400).json({ error: "ID do usuário não fornecido" });
    }

    const result = await pool.query("SELECT id, nome, email, familia_id FROM users WHERE id = $1", [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});



const PORT = process.env.PORT || 3008;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// Exporta app como default
export default app;