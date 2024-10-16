USE voyageonsensemble;
DROP TABLE IF EXISTS comments; -- Drop comments first to avoid foreign key constraint
DROP TABLE IF EXISTS articles; -- Drop articles next
DROP TABLE IF EXISTS users; -- Finally, drop users

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NULL DEFAULT 'anonymous',
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);


