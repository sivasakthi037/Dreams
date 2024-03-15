import { Hono } from 'hono'
import { cors } from 'hono/cors';

type Bindings = {
  "DB": D1Database;
}


//id	title	content	timestamp	likes	topics	self_destruct_time	anonymous_user_id
//const c.env.DB = new D1Database('dreams'); // Replace 'dreams' with your namespace name

// Error handling helper function
const handleError = (c: any, message: string, status = 500) => {
  console.error('API Error:', message);
  return c.json({ error: message }, status);
}

const app = new Hono<{Bindings: Bindings}>();


app.use('*', async (c, next) => {

  // CORS middleware configuration
  const corsMiddleware = cors({
    origin: ['http://localhost:5173', 'https://dreams-52z.pages.dev','https://dream-amber.vercel.app'],
    allowHeaders: ['Origin', 'Content-Type', 'Authorization'],
    allowMethods: ['GET', 'OPTIONS', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })

  // Apply CORS middleware to all routes to allow cross-origin requests
  return await corsMiddleware(c, next)
})


// **Frontend Routes** 

// **Backend API Routes**
app.get('/dreams', async (c) => {
  let query = 'SELECT * FROM dreams';
  const params = new URLSearchParams(c.req.url);

  //(edge case: invalid topic)
  const topic = params.get('filter_category');
  if (topic) {
    query += ` WHERE topic = ?`;

    // Simulate topic existence check (replace with actual D1Database logic)
    try {
      await c.env.DB.prepare('SELECT 1 FROM dreams WHERE topic = ? LIMIT 1').bind([topic]).run();
    } catch (error) {
      return c.json({ message: 'Invalid filter category provided' }, 400);
    }
  }

  // Handle search query
  const search = params.get('search');
  if (search) {
    query += ` WHERE title LIKE ? OR content LIKE ?`;
  }

  // Pagination logic (edge case: empty results for specific page)
  const limit = parseInt(params.get('limit') || '50');
  const page = parseInt(params.get('page') || '1');
  const offset = (page - 1) * limit;
  query += ` LIMIT ${limit} OFFSET ${offset}`;

  try {
    type OrderRow = [number, string, string, number, number, string, number, string];

    const results = await c.env.DB.prepare(query).raw();
    const rows = JSON.parse(JSON.stringify(results));
    const dreams = rows.map((row: OrderRow) => ({
      id: row[0], // Adjust column indices as needed
      title: row[1],
      content: row[2],
      timestamp: row[3],
      likes: row[4],
      topics: row[5],
      self_destruct_time: row[6],
      anonymous_user_id: row[7]
    }));

    return c.json(dreams);
  } catch (error) {
    const message = (error as Error).message || 'Error';
    console.error('Error:', error);
    return c.json({ message }, 500);
  }

});


app.get('/dreams/:id', async (c) => {
  const id = c.req.param('id');
  // console.log(id)
  // const query =await c.env.DB.prepare('SELECT * FROM dreams WHERE id = ?').bind(id).raw();
  // return c.json(query);

  // Validate dream ID (edge case)
  if (!id) {
    return c.json({ message: 'Invalid dream ID provided' }, 400);
  }

  const query = 'SELECT * FROM dreams WHERE id = ?';
  try {
    const results = await c.env.DB.prepare(query).bind(id).all(); // Use all() for single row results

    if (!results) {
      return c.json({ message: 'Dream not found' }, 404);
    }

    const dream = results.results; // Access the first element of the array (single row)

    return c.json(dream);
  } catch (error) {
    console.error('Error fetching dream details:', error);
    return c.json({ message: 'Error fetching dream details' }, 500);
  }
});

app.post('/dreams', async (c) => {
  try {
    const { title, content, topics = [], selfDestructTime } = await c.req.json();
    
    // Convert topics array to string
    const topicsString = JSON.stringify(topics);

    const timestamp = JSON.stringify(Date().slice(0,24)); // Current date and time in ISO format

    const query = `
      INSERT INTO dreams (title, content, topics, timestamp, self_destruct_time, anonymous_user_id)
      VALUES ('${title}', '${content}', '${topicsString}', ${timestamp}, '${selfDestructTime}', '')`;

    await c.env.DB.prepare(query).run();

    return c.json({ message: 'Dream created successfully' }, 201); // 201 Created status code
  } catch (error) {
    const message = (error as Error).message || 'Error creating dream';
    console.error('Error creating dream:', error);
    return c.json({ message }, 500);
  }
});



app.put('/dreams/:id/like', async (c) => {
  const id = c.req.param('id');

  // Validate dream ID (edge case)
  if (!id) {
    return c.json({ message: 'Invalid dream ID provided' }, 400);
  }

  const query = 'UPDATE dreams SET likes = likes + 1 WHERE id = ?';
  try {
    await c.env.DB.prepare(query).bind(id).run();
    return c.json({ message: 'Dream liked successfully!' });
  } catch (error) {
    const message = (error as Error).message || 'Error';
    console.error('Error:', error);
    //return the message to the user
    return c.json({ message }, 500);
    // return c.json({ message: 'Error creating dream' });
  }
});
app.put('/dreams/:id/react/:reaction_type', async (c) => {
  const id = c.req.param('id');
  const reactionType = c.req.param('reaction_type');

  // Validate dream ID and reaction type (edge cases)
  if (!id || !reactionType) {
    return c.json({ message: 'Invalid dream ID or reaction type provided' }, 400);
  }

  const query = 'UPDATE dreams SET reactions = json_set(reactions, ?, ?) WHERE id = ?';
  try {
    await c.env.DB.prepare(query).bind(['$.' + reactionType, 1, id]).run();
    return c.json({ message: 'Dream reaction submitted successfully!' });
  } catch (error) {
  const message = (error as Error).message || 'Error';
  console.error('Error:', error);
  return c.json({ message }, 500);
}
});

app.put('/dreams/:id/react/:reaction_type', async (c) => {
  const id = c.req.param('id');
  const reactionType = c.req.param('reaction_type');

  // Validate dream ID and reaction type (edge cases)
  if (!id || !reactionType) {
    return c.json({ message: 'Invalid dream ID or reaction type provided' }, 400);
  }

  // Construct the query to either insert or update the reaction count
  const query = `
    INSERT INTO reactions (dream_id, reaction_type, count)
    VALUES (?, ?, 1)
    ON DUPLICATE KEY UPDATE count = count + 1
  `;

  try {
    await c.env.DB.prepare(query).bind(id, reactionType).run();
    return c.json({ message: 'Dream reaction submitted successfully!' });
  } catch (error) {
    const message = (error as Error).message || 'Error';
    console.error('Error:', error);
    return c.json({ message }, 500);
  }
});

app.delete('/dreams/:id', async (c) => {
  const id = c.req.param('id');

  // Validate dream ID (edge case)
  if (!id) {
    return c.json({ message: 'Invalid dream ID provided' }, 400);
  }

  try {
    // Option 1: Cascade Delete (if applicable):
    // Check if your database system supports cascade delete for foreign keys.
    // await c.env.DB.prepare('DELETE FROM dreams WHERE id = ?').bind(id).run();

    // Option 2: Manual Deletion (Recommended if Cascade Delete is not supported):
    // 1. Delete Reactions First

    await c.env.DB.prepare('DELETE FROM reactions WHERE dream_id = ?').bind(id).run();

    // 2. Then Delete Dream
    await c.env.DB.prepare('DELETE FROM dreams WHERE id = ?').bind(id).run();

    return c.json({ message: 'Dream deleted successfully!' });
  } catch (error) {
    const message = (error as Error).message || 'Error';
    console.error('Error:', error);
    return c.json({ message }, 500);
  }
});

export default app;