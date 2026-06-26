-- ORBEM SOLUTIONS Database Schema
-- Run this file in your MySQL client: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS orbem_solutions;
USE orbem_solutions;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  company VARCHAR(100),
  address TEXT,
  gst_number VARCHAR(32),
  city VARCHAR(100),
  county VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_id INT NOT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('draft','sent','paid','overdue') DEFAULT 'draft',
  due_date DATE,
  issue_date DATE DEFAULT (CURDATE()),
  notes TEXT,
  reminder_email_sent TIMESTAMP NULL,
  due_date_email_sent TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  invoice_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE NOT NULL,
  method ENUM('cash','bank_transfer','card','upi','other') DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

-- Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_id INT NOT NULL,
  quotation_number VARCHAR(50) NOT NULL,
  items JSON NOT NULL,
  tax_rate DECIMAL(5,2) DEFAULT 0.00,
  discount DECIMAL(10,2) DEFAULT 0.00,
  estimated_amount DECIMAL(10,2) NOT NULL,
  origin_airport VARCHAR(100) NULL,
  destination_airport VARCHAR(100) NULL,
  validity_days INT DEFAULT 30,
  status ENUM('draft','sent','accepted','rejected') DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
