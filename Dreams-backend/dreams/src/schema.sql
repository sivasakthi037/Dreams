//DBML CODE

CREATE TABLE dreams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  likes INTEGER DEFAULT 0,
  topics TEXT,
  self_destruct_time INTEGER,
  anonymous_user_id TEXT
);

CREATE TABLE reactions (
  dream_id INTEGER NOT NULL,
  reaction_type TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  PRIMARY KEY (dream_id, reaction_type),
  FOREIGN KEY (dream_id) REFERENCES dreams(id)
);



TABLE dreams {
    id INTEGER [PRIMARY KEY]
    title TEXT
    content TEXT
    timestamp INTEGER
    likes INTEGER
    topics TEXT
    self_destruct_time INTEGER
    anonymous_user_id TEXT
  }
  
  TABLE reactions {
    dream_id INTEGER [primary key]
    reaction_type TEXT [primary key]
    count INTEGER
  }
  
  
  
  ref : reactions.dream_id > dreams.id
  