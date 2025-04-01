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
  const { stateVector } = req.body;

  if (!stateVector) {
    return res.status(400).json({ error: "stateVector não fornecido." });
  }

  try {
    console.log("📥 Recebendo stateVector do cliente:", stateVector);

    // Converter Base64 para Uint8Array corretamente
    const clientVector = new Uint8Array(Buffer.from(stateVector, "base64"));

    // Criar um novo documento Yjs
    let yjsDoc = new Y.Doc();

    // Buscar estado salvo no banco
    const result = await pool.query("SELECT yjs_updates FROM yjs_state WHERE id = 1");

    if (result.rows.length > 0) {
      const storedUpdates = result.rows[0].yjs_updates;
      if (storedUpdates && storedUpdates.length > 0) {
        console.log("📄 Aplicando updates salvos do banco");
        storedUpdates.forEach((update) => {
          Y.applyUpdate(yjsDoc, new Uint8Array(update));
        });
      }
    } else {
      console.log("⚠️ Nenhum estado encontrado no banco.");
    }

    // Gerar apenas as mudanças que faltam para o cliente
    const missingUpdates = Y.encodeStateAsUpdate(yjsDoc, clientVector);

    console.log("📤 Enviando updates para o cliente:", missingUpdates);

    res.json({ success: true, update: Buffer.from(missingUpdates).toString("base64") });
  } catch (error) {
    console.error("❌ Erro ao sincronizar Yjs:", error);
    res.status(500).json({ error: "Erro ao sincronizar Yjs." });
  }
});

// Salvar updates recebidos do cliente
app.post("/api/update", async (req, res) => {
  const { update } = req.body;

  if (!update) {
    return res.status(400).json({ error: "Nenhum update recebido." });
  }

  try {
    console.log("📥 Recebendo update do cliente:", update);

    const updateBuffer = new Uint8Array(Buffer.from(update, "base64"));

    // Salvar incrementalmente no banco
    await pool.query(
        `INSERT INTO yjs_state (id, yjs_updates) 
       VALUES (1, ARRAY[$1]::bytea[]) 
       ON CONFLICT (id) DO UPDATE SET yjs_updates = array_append(yjs_state.yjs_updates, $1)`,
        [Buffer.from(updateBuffer)]
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

    const result = await pool.query("SELECT id, nome, email FROM users WHERE id = $1", [userId]);

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