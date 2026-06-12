import { DataTypes } from 'sequelize';
import sequelize from './db.js';

// User Model
export const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'Student',
    validate: {
      isIn: [['Student', 'Admin']]
    }
  },
  plan: {
    type: DataTypes.STRING,
    defaultValue: 'Free',
    validate: {
      isIn: [['Free', 'Premium']]
    }
  },
  daily_query_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_query_reset: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  verification_code: {
    type: DataTypes.STRING,
    allowNull: true
  },
  profile_pic: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

// Conversation Model
export const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  model: {
    type: DataTypes.STRING,
    defaultValue: 'llama3.2'
  }
});

// Message Model
export const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  role: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['user', 'assistant']]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  latency_ms: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// Document Model
export const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  filename: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'General'
  },
  file_size: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

// DocumentChunk Model
export const DocumentChunk = sequelize.define('DocumentChunk', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chunk_index: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  embedding: {
    type: DataTypes.JSON, // Stores vector embeddings array: [0.1, -0.25, ...]
    allowNull: false
  }
});

// Snippet Model
export const Snippet = sequelize.define('Snippet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  language: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

// Interview Model
export const Interview = sequelize.define('Interview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  topic: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.STRING, // 'technical' or 'aptitude'
    allowNull: false
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  feedback: {
    type: DataTypes.TEXT, // Will store feedback report (JSON string)
    allowNull: false
  }
});

// Transaction Model
export const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'USD'
  },
  status: {
    type: DataTypes.STRING, // 'succeeded', 'failed'
    allowNull: false
  },
  plan_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  invoice_id: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Relational Mappings
User.hasMany(Conversation, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Conversation.belongsTo(User, { foreignKey: 'user_id' });

Conversation.hasMany(Message, { foreignKey: 'conversation_id', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });

User.hasMany(Document, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Document.belongsTo(User, { foreignKey: 'user_id' });

Document.hasMany(DocumentChunk, { foreignKey: 'document_id', onDelete: 'CASCADE' });
DocumentChunk.belongsTo(Document, { foreignKey: 'document_id' });

User.hasMany(Snippet, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Snippet.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Interview, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Interview.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Transaction, { foreignKey: 'user_id', onDelete: 'CASCADE' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

export default {
  sequelize,
  User,
  Conversation,
  Message,
  Document,
  DocumentChunk,
  Snippet,
  Interview,
  Transaction
};
