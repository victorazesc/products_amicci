const express = require('express');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Configuração do pool de conexão com PostgreSQL (ajuste conforme necessário)
const pool = new Pool({
  user: 'datastream',
  host: 'prod-apis-db.cluster-coy9yv3kxit4.us-east-1.rds.amazonaws.com',
  database: 'seller_prd',
  password: '1QmgPTAUf3c5L3NmByHR4DL2u',
  port: 5432, // Porta padrão do PostgreSQL
});

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware para tratar o body das requisições como JSON
app.use(express.json());

// Rota para buscar todos os produtos
app.get('/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM api_produto');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao buscar produtos');
  }
});

// Rota para buscar todas as categorias
app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM api_productcategory');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao buscar categorias');
  }
});

// Rota para buscar todos os fornecedores
app.get('/suppliers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM api_seller');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao buscar fornecedores');
  }
});

// Rota para buscar um produto por ID
app.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM api_produto WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send('Produto não encontrado');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao buscar produto');
  }
});

// Rota para buscar produtos por categoria
app.get('/categories/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM api_produto WHERE category_id = $1', [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao buscar produtos por categoria');
  }
});


app.get('/suppliers/category/:category_name', async (req, res) => {
  try {
    const { category_name } = req.params;
    const query = `
      SELECT api_seller.company_name AS supplier_name,
             api_seller.trading_name AS comercial_name,
             api_productvariant.variant_name AS variant,
             api_produto.name AS product
      FROM api_seller
      INNER JOIN api_produto ON api_produto.seller_id = api_seller.id
      INNER JOIN api_productcategory ON api_produto.category_id = api_productcategory.id
      INNER JOIN api_productvariant ON api_produto.id = api_productvariant.product_id
      WHERE api_productcategory.upper_name = $1
    `;
    const result = await pool.query(query, [category_name.toUpperCase()]);
    
    // Agrupar por fornecedor
    const groupedSuppliers = result.rows.reduce((acc, curr) => {
      const supplier = acc.find(item => item.supplier_name === curr.supplier_name);
      
      if (supplier) {
        // Se o fornecedor já existe, adiciona o produto e a variante ao array de produtos
        supplier.products.push({
          product_name: curr.product,
          variant: curr.variant
        });
      } else {
        // Se o fornecedor não existe, cria um novo objeto para ele
        acc.push({
          supplier_name: curr.supplier_name,
          comercial_name: curr.comercial_name,
          products: [
            {
              product_name: curr.product,
              variant: curr.variant
            }
          ]
        });
      }
      return acc;
    }, []);

    // Retornar o resultado agrupado
    res.json(groupedSuppliers);

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Erro ao buscar fornecedores');
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`API rodando na porta ${PORT}`);
});