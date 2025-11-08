const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const Store = require('electron-store');
const { v4: uuidv4 } = require('uuid');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Initialize electron-store for app settings
const store = new Store();

let mainWindow;
let db;
let server;

// Setup logging
const logDir = path.join(app.getPath('userData'), 'logs');
const logFile = path.join(logDir, 'app.log');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Custom logger that writes to both console and file
function log(level, message, ...args) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message} ${args.length > 0 ? JSON.stringify(args) : ''}`;

  // Write to console
  console.log(logMessage);

  // Write to file
  try {
    fs.appendFileSync(logFile, logMessage + '\n');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Log levels
const logger = {
  info: (message, ...args) => log('INFO', message, ...args),
  error: (message, ...args) => log('ERROR', message, ...args),
  warn: (message, ...args) => log('WARN', message, ...args),
  debug: (message, ...args) => log('DEBUG', message, ...args)
};

// Log app startup
logger.info('=== FICOS Campaign Manager Starting ===');
logger.info('App version:', app.getVersion());
logger.info('User data path:', app.getPath('userData'));
logger.info('Log file location:', logFile);

// Initialize SQLite database
function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'ficos.db');
  logger.info('[DATABASE] Initializing database at:', dbPath);

  db = new Database(dbPath);

  // Enable WAL mode for better concurrency and crash recovery
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = FULL');
  db.pragma('foreign_keys = ON');

  logger.info('[DATABASE] WAL mode enabled, synchronous=FULL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      twofa_enabled INTEGER DEFAULT 0,
      twofa_secret TEXT,
      biometric_enabled INTEGER DEFAULT 0,
      biometric_public_key TEXT,
      recovery_email TEXT,
      password_reset_token TEXT,
      password_reset_expires TEXT,
      last_login TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      form_html TEXT NOT NULL,
      status TEXT DEFAULT 'DRAFT',
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sent_at TEXT,
      scheduled_for TEXT,
      subject_line TEXT,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      first_name TEXT,
      last_name TEXT,
      company TEXT,
      phone TEXT,
      tags TEXT,
      custom_fields TEXT,
      subscribed INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaign_emails (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
      opened INTEGER DEFAULT 0,
      opened_at TEXT,
      clicked INTEGER DEFAULT 0,
      clicked_at TEXT,
      bounced INTEGER DEFAULT 0,
      unsubscribed INTEGER DEFAULT 0,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id)
    );

    CREATE TABLE IF NOT EXISTS form_responses (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      contact_email TEXT NOT NULL,
      response_data TEXT NOT NULL,
      submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
      ip_address TEXT,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS email_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      smtp_host TEXT NOT NULL,
      smtp_port INTEGER NOT NULL,
      smtp_user TEXT NOT NULL,
      smtp_password TEXT NOT NULL,
      from_email TEXT NOT NULL,
      from_name TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      daily_limit INTEGER DEFAULT 500,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaign_permissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      can_view INTEGER DEFAULT 1,
      can_edit INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id),
      UNIQUE(user_id, campaign_id)
    );
    
    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      html_content TEXT NOT NULL,
      created_by TEXT NOT NULL,
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS contact_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    
    CREATE TABLE IF NOT EXISTS contact_list_members (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      added_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (list_id) REFERENCES contact_lists(id),
      FOREIGN KEY (contact_id) REFERENCES contacts(id),
      UNIQUE(list_id, contact_id)
    );
    
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS user_invitations (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      invited_by TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      accepted INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invited_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS device_contacts (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      imported_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      company_name TEXT,
      company_logo TEXT,
      brand_color TEXT DEFAULT '#667eea',
      tos_accepted INTEGER DEFAULT 0,
      tos_accepted_date TEXT,
      tos_version TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS campaign_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL,
      html_content TEXT NOT NULL,
      thumbnail TEXT,
      is_system INTEGER DEFAULT 0,
      created_by TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  console.log('Database initialized at:', dbPath);

  // Populate default templates if they don't exist
  populateDefaultTemplates();
}

// Populate default campaign templates
function populateDefaultTemplates() {
  const count = db.prepare('SELECT COUNT(*) as count FROM campaign_templates WHERE is_system = 1').get();

  if (count.count > 0) {
    console.log('Default templates already exist, skipping...');
    return;
  }

  console.log('Populating default campaign templates...');

  const templates = [
    // Headers
    {
      id: 'header-logo-center',
      name: 'Centered Header with Logo',
      description: 'Professional header with centered company logo and name',
      category: 'Headers',
      html_content: `<div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
  <img src="{{company_logo}}" alt="{{company_name}}" style="max-width: 200px; margin-bottom: 20px;" />
  <h1 style="margin: 0; font-size: 32px; font-weight: bold;">{{company_name}}</h1>
</div>`
    },
    {
      id: 'header-simple',
      name: 'Simple Header',
      description: 'Clean header with company name',
      category: 'Headers',
      html_content: `<div style="padding: 30px 20px; background-color: #667eea; color: white; border-bottom: 4px solid #764ba2;">
  <h1 style="margin: 0; font-size: 28px;">{{company_name}}</h1>
</div>`
    },

    // Footers
    {
      id: 'footer-social-links',
      name: 'Footer with Social Links',
      description: 'Footer with social media icons and links',
      category: 'Footers',
      html_content: `<div style="padding: 40px 20px; background-color: #f5f5f5; text-align: center; border-top: 1px solid #ddd;">
  <p style="margin: 0 0 20px 0; color: #666;">Connect with us:</p>
  <div style="margin-bottom: 20px;">
    <a href="https://facebook.com" style="margin: 0 10px; text-decoration: none;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%233b5998'%3E%3Cpath d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'/%3E%3C/svg%3E" alt="Facebook" style="width: 32px; height: 32px;" />
    </a>
    <a href="https://twitter.com" style="margin: 0 10px; text-decoration: none;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%231DA1F2'%3E%3Cpath d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z'/%3E%3C/svg%3E" alt="Twitter" style="width: 32px; height: 32px;" />
    </a>
    <a href="https://linkedin.com" style="margin: 0 10px; text-decoration: none;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='%230077b5'%3E%3Cpath d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'/%3E%3C/svg%3E" alt="LinkedIn" style="width: 32px; height: 32px;" />
    </a>
    <a href="https://instagram.com" style="margin: 0 10px; text-decoration: none;">
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='url(%23instagram-gradient)'%3E%3Cdefs%3E%3ClinearGradient id='instagram-gradient' x1='0%25' y1='100%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%23feda75'/%3E%3Cstop offset='50%25' style='stop-color:%23fa7e1e'/%3E%3Cstop offset='100%25' style='stop-color:%23d62976'/%3E%3C/linearGradient%3E%3C/defs%3E%3Cpath d='M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z'/%3E%3C/svg%3E" alt="Instagram" style="width: 32px; height: 32px;" />
    </a>
  </div>
  <p style="margin: 0; color: #999; font-size: 12px;">&copy; {{year}} {{company_name}}. All rights reserved.</p>
</div>`
    },
    {
      id: 'footer-simple',
      name: 'Simple Footer',
      description: 'Minimal footer with copyright',
      category: 'Footers',
      html_content: `<div style="padding: 20px; background-color: #333; color: white; text-align: center;">
  <p style="margin: 0; font-size: 14px;">&copy; {{year}} {{company_name}}. All rights reserved.</p>
</div>`
    },

    // Call to Action Buttons
    {
      id: 'cta-email',
      name: 'Email Call-to-Action',
      description: 'Button to contact via email',
      category: 'Call to Action',
      html_content: `<div style="text-align: center; padding: 20px;">
  <a href="mailto:contact@company.com" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
    Email Us
  </a>
</div>`
    },
    {
      id: 'cta-phone',
      name: 'Phone Call-to-Action',
      description: 'Button to call phone number',
      category: 'Call to Action',
      html_content: `<div style="text-align: center; padding: 20px;">
  <a href="tel:+1234567890" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #2ecc71, #27ae60); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
    Call Us: (123) 456-7890
  </a>
</div>`
    },
    {
      id: 'cta-website',
      name: 'Visit Website Button',
      description: 'Button to visit website',
      category: 'Call to Action',
      html_content: `<div style="text-align: center; padding: 20px;">
  <a href="https://www.yourwebsite.com" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #3498db, #2980b9); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
    Visit Our Website
  </a>
</div>`
    },

    // Social Media Icons
    {
      id: 'social-facebook',
      name: 'Facebook Icon Link',
      description: 'Single Facebook icon with link',
      category: 'Social Icons',
      html_content: `<a href="https://facebook.com/yourpage" style="display: inline-block; margin: 5px;">
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%233b5998'%3E%3Cpath d='M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'/%3E%3C/svg%3E" alt="Facebook" style="width: 40px; height: 40px;" />
</a>`
    },
    {
      id: 'social-twitter',
      name: 'Twitter Icon Link',
      description: 'Single Twitter icon with link',
      category: 'Social Icons',
      html_content: `<a href="https://twitter.com/yourhandle" style="display: inline-block; margin: 5px;">
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%231DA1F2'%3E%3Cpath d='M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z'/%3E%3C/svg%3E" alt="Twitter" style="width: 40px; height: 40px;" />
</a>`
    },
    {
      id: 'social-linkedin',
      name: 'LinkedIn Icon Link',
      description: 'Single LinkedIn icon with link',
      category: 'Social Icons',
      html_content: `<a href="https://linkedin.com/company/yourcompany" style="display: inline-block; margin: 5px;">
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%230077b5'%3E%3Cpath d='M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z'/%3E%3C/svg%3E" alt="LinkedIn" style="width: 40px; height: 40px;" />
</a>`
    },
    {
      id: 'social-instagram',
      name: 'Instagram Icon Link',
      description: 'Single Instagram icon with link',
      category: 'Social Icons',
      html_content: `<a href="https://instagram.com/yourprofile" style="display: inline-block; margin: 5px;">
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24'%3E%3Cdefs%3E%3CradialGradient id='ig' cx='30%25' cy='107%25'%3E%3Cstop offset='0%25' stop-color='%23fdf497'/%3E%3Cstop offset='5%25' stop-color='%23fdf497'/%3E%3Cstop offset='45%25' stop-color='%23fd5949'/%3E%3Cstop offset='60%25' stop-color='%23d6249f'/%3E%3Cstop offset='90%25' stop-color='%23285AEB'/%3E%3C/radialGradient%3E%3C/defs%3E%3Cpath fill='url(%23ig)' d='M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z'/%3E%3C/svg%3E" alt="Instagram" style="width: 40px; height: 40px;" />
</a>`
    },
    {
      id: 'social-youtube',
      name: 'YouTube Icon Link',
      description: 'Single YouTube icon with link',
      category: 'Social Icons',
      html_content: `<a href="https://youtube.com/yourchannel" style="display: inline-block; margin: 5px;">
  <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23FF0000'%3E%3Cpath d='M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z'/%3E%3C/svg%3E" alt="YouTube" style="width: 40px; height: 40px;" />
</a>`
    },

    // Dividers
    {
      id: 'divider-solid',
      name: 'Solid Line Divider',
      description: 'Simple horizontal line separator',
      category: 'Dividers',
      html_content: `<hr style="border: none; border-top: 2px solid #ddd; margin: 30px 0;" />`
    },
    {
      id: 'divider-gradient',
      name: 'Gradient Divider',
      description: 'Colorful gradient line separator',
      category: 'Dividers',
      html_content: `<hr style="border: none; height: 3px; background: linear-gradient(90deg, #667eea 0%, #764ba2 100%); margin: 30px 0;" />`
    },

    // Content Blocks
    {
      id: 'content-text-image',
      name: 'Text with Image (Side by Side)',
      description: 'Two-column layout with text and image',
      category: 'Content Blocks',
      html_content: `<div style="display: flex; gap: 30px; padding: 40px 20px; align-items: center;">
  <div style="flex: 1;">
    <h2 style="margin-top: 0; color: #333;">Your Heading Here</h2>
    <p style="color: #666; line-height: 1.6;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
  </div>
  <div style="flex: 1;">
    <img src="https://via.placeholder.com/400x300" alt="Placeholder" style="width: 100%; border-radius: 8px;" />
  </div>
</div>`
    },
    {
      id: 'content-centered-text',
      name: 'Centered Text Block',
      description: 'Centered text content section',
      category: 'Content Blocks',
      html_content: `<div style="text-align: center; padding: 60px 20px; max-width: 700px; margin: 0 auto;">
  <h2 style="margin-top: 0; font-size: 32px; color: #333;">Welcome to Our Campaign</h2>
  <p style="color: #666; line-height: 1.8; font-size: 16px;">This is a great place to introduce your message, share important information, or invite your audience to take action.</p>
</div>`
    }
  ];

  const insertStmt = db.prepare('INSERT INTO campaign_templates (id, name, description, category, html_content, is_system) VALUES (?, ?, ?, ?, ?, 1)');

  const transaction = db.transaction((templates) => {
    for (const template of templates) {
      insertStmt.run(template.id, template.name, template.description, template.category, template.html_content);
    }
  });

  transaction(templates);
  console.log(`Inserted ${templates.length} default templates`);
}

// Check if setup is needed
function needsSetup() {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const result = stmt.get();
  return result.count === 0;
}

// Check if TOS accepted
function isTosAccepted() {
  try {
    const stmt = db.prepare('SELECT tos_accepted, tos_version FROM company_settings WHERE id = "default"');
    const result = stmt.get();
    return result && result.tos_accepted === 1 && result.tos_version === '3.0';
  } catch (error) {
    return false;
  }
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'build/icon.png'),
    show: false
  });

  // Show splash screen
  mainWindow.loadFile('src/splash.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // After 2 seconds, check navigation path
    setTimeout(() => {
      if (!isTosAccepted()) {
        // Must accept TOS first
        mainWindow.loadFile('src/terms-of-service.html');
      } else if (needsSetup()) {
        // Setup wizard for new installations
        mainWindow.loadFile('src/setup-wizard.html');
      } else {
        // Normal login
        mainWindow.loadFile('src/login.html');
      }
    }, 2000);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers

// Setup: Create owner account
ipcMain.handle('setup-owner', async (event, data) => {
  try {
    const { name, email, password, companyName } = data;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create owner
    const userId = uuidv4();
    const stmt = db.prepare('INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)');
    stmt.run(userId, email, name, hashedPassword, 'OWNER');
    
    // Save company settings
    store.set('company', {
      name: companyName,
      setupComplete: true
    });
    
    return { success: true, userId };
  } catch (error) {
    console.error('Setup error:', error);
    return { success: false, error: error.message };
  }
});

// Login
ipcMain.handle('login', async (event, data) => {
  try {
    const { email, password, twoFactorCode } = data;
    
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);
    
    if (!user) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return { success: false, error: 'Invalid credentials' };
    }
    
    // Check 2FA if enabled
    if (user.twofa_enabled && user.twofa_secret) {
      if (!twoFactorCode) {
        return { success: false, requiresTwoFactor: true };
      }
      
      const speakeasy = require('speakeasy');
      const verified = speakeasy.totp.verify({
        secret: user.twofa_secret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });
      
      if (!verified) {
        return { success: false, error: 'Invalid 2FA code' };
      }
    }
    
    // Update last login
    db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    
    // Store session
    store.set('session', {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
    
    // Log audit
    logAudit(user.id, 'LOGIN', 'user', user.id, 'User logged in');
    
    return { 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
});

// 2FA Setup
ipcMain.handle('setup-2fa', async (event, userId) => {
  try {
    const speakeasy = require('speakeasy');
    const qrcode = require('qrcode');
    
    const secret = speakeasy.generateSecret({
      name: 'FICOS Campaign Manager',
      length: 32
    });
    
    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    
    // Save secret temporarily (not enabled until verified)
    db.prepare('UPDATE users SET twofa_secret = ? WHERE id = ?').run(secret.base32, userId);
    
    return {
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Verify and Enable 2FA
ipcMain.handle('enable-2fa', async (event, data) => {
  try {
    const { userId, token } = data;
    const speakeasy = require('speakeasy');
    
    const stmt = db.prepare('SELECT twofa_secret FROM users WHERE id = ?');
    const user = stmt.get(userId);
    
    if (!user || !user.twofa_secret) {
      return { success: false, error: '2FA not set up' };
    }
    
    const verified = speakeasy.totp.verify({
      secret: user.twofa_secret,
      encoding: 'base32',
      token: token,
      window: 2
    });
    
    if (!verified) {
      return { success: false, error: 'Invalid code' };
    }
    
    // Enable 2FA
    db.prepare('UPDATE users SET twofa_enabled = 1 WHERE id = ?').run(userId);
    logAudit(userId, 'ENABLE_2FA', 'user', userId, '2FA enabled');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Disable 2FA
ipcMain.handle('disable-2fa', async (event, data) => {
  try {
    const { userId, password } = data;
    
    const stmt = db.prepare('SELECT password FROM users WHERE id = ?');
    const user = stmt.get(userId);
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return { success: false, error: 'Invalid password' };
    }
    
    db.prepare('UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ?').run(userId);
    logAudit(userId, 'DISABLE_2FA', 'user', userId, '2FA disabled');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Request Password Reset
ipcMain.handle('request-password-reset', async (event, email) => {
  try {
    const stmt = db.prepare('SELECT id, recovery_email FROM users WHERE email = ?');
    const user = stmt.get(email);
    
    if (!user) {
      // Don't reveal if user exists
      return { success: true, message: 'If account exists, reset email sent' };
    }
    
    const resetToken = uuidv4();
    const expires = new Date(Date.now() + 3600000).toISOString(); // 1 hour
    
    db.prepare('UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?')
      .run(resetToken, expires, user.id);
    
    // In a real app, send email here
    // For now, show token in console (dev mode)
    console.log('Password reset token:', resetToken);
    
    logAudit(user.id, 'PASSWORD_RESET_REQUEST', 'user', user.id, 'Password reset requested');
    
    return { 
      success: true, 
      message: 'Reset instructions sent',
      devToken: resetToken // Remove in production
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Reset Password with Token
ipcMain.handle('reset-password', async (event, data) => {
  try {
    const { token, newPassword } = data;
    
    const stmt = db.prepare('SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > ?');
    const user = stmt.get(token, new Date().toISOString());
    
    if (!user) {
      return { success: false, error: 'Invalid or expired reset token' };
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    db.prepare('UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?')
      .run(hashedPassword, user.id);
    
    logAudit(user.id, 'PASSWORD_RESET', 'user', user.id, 'Password reset completed');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Enable Biometric
ipcMain.handle('enable-biometric', async (event, data) => {
  try {
    const { userId, publicKey } = data;
    
    db.prepare('UPDATE users SET biometric_enabled = 1, biometric_public_key = ? WHERE id = ?')
      .run(publicKey, userId);
    
    logAudit(userId, 'ENABLE_BIOMETRIC', 'user', userId, 'Biometric authentication enabled');
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Verify Biometric
ipcMain.handle('verify-biometric', async (event, data) => {
  try {
    const { email, signature } = data;
    
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND biometric_enabled = 1');
    const user = stmt.get(email);
    
    if (!user || !user.biometric_public_key) {
      return { success: false, error: 'Biometric not set up' };
    }
    
    // In production, verify signature with stored public key
    // For now, simplified check
    if (signature && signature.length > 0) {
      store.set('session', {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
      
      db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
      logAudit(user.id, 'BIOMETRIC_LOGIN', 'user', user.id, 'Logged in via biometric');
      
      return { 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      };
    }
    
    return { success: false, error: 'Biometric verification failed' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get current session
ipcMain.handle('get-session', () => {
  return store.get('session', null);
});

// Logout
ipcMain.handle('logout', () => {
  store.delete('session');
  return { success: true };
});

// Campaign operations
ipcMain.handle('get-campaigns', (event, userId) => {
  const stmt = db.prepare(`
    SELECT c.*, u.name as creator_name 
    FROM campaigns c
    LEFT JOIN users u ON c.created_by = u.id
    WHERE c.created_by = ? OR EXISTS (
      SELECT 1 FROM campaign_permissions cp 
      WHERE cp.campaign_id = c.id AND cp.user_id = ? AND cp.can_view = 1
    )
    ORDER BY c.created_at DESC
  `);
  return stmt.all(userId, userId);
});

ipcMain.handle('create-campaign', (event, data) => {
  const { name, description, formHtml, userId } = data;
  const id = uuidv4();
  
  const stmt = db.prepare('INSERT INTO campaigns (id, name, description, form_html, created_by) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, name, description || '', formHtml, userId);
  
  return { success: true, id };
});

ipcMain.handle('get-campaign', (event, id) => {
  const stmt = db.prepare('SELECT * FROM campaigns WHERE id = ?');
  return stmt.get(id);
});

ipcMain.handle('update-campaign', (event, data) => {
  const { id, name, description, formHtml, status } = data;
  
  const stmt = db.prepare('UPDATE campaigns SET name = ?, description = ?, form_html = ?, status = ? WHERE id = ?');
  stmt.run(name, description, formHtml, status, id);
  
  return { success: true };
});

ipcMain.handle('delete-campaign', (event, id) => {
  const stmt = db.prepare('DELETE FROM campaigns WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

// Contact operations
ipcMain.handle('get-contacts', () => {
  const stmt = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC');
  return stmt.all();
});

ipcMain.handle('create-contact', (event, data) => {
  const { email, firstName, lastName, company, phone, tags } = data;
  const id = uuidv4();
  
  const stmt = db.prepare('INSERT INTO contacts (id, email, first_name, last_name, company, phone, tags) VALUES (?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, email, firstName || '', lastName || '', company || '', phone || '', tags || '');
  
  return { success: true, id };
});

ipcMain.handle('import-contacts', (event, contacts) => {
  const stmt = db.prepare('INSERT OR IGNORE INTO contacts (id, email, first_name, last_name, company, phone) VALUES (?, ?, ?, ?, ?, ?)');
  
  const transaction = db.transaction((contactList) => {
    for (const contact of contactList) {
      stmt.run(
        uuidv4(),
        contact.email,
        contact.firstName || '',
        contact.lastName || '',
        contact.company || '',
        contact.phone || ''
      );
    }
  });
  
  transaction(contacts);
  return { success: true, count: contacts.length };
});

ipcMain.handle('delete-contact', (event, id) => {
  const stmt = db.prepare('DELETE FROM contacts WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

// Email config operations
ipcMain.handle('get-email-configs', () => {
  const stmt = db.prepare('SELECT * FROM email_configs ORDER BY is_default DESC, created_at DESC');
  return stmt.all();
});

ipcMain.handle('save-email-config', (event, data) => {
  const { name, smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName, isDefault } = data;
  const id = uuidv4();
  
  // If setting as default, unset other defaults
  if (isDefault) {
    db.prepare('UPDATE email_configs SET is_default = 0').run();
  }
  
  const stmt = db.prepare('INSERT INTO email_configs (id, name, smtp_host, smtp_port, smtp_user, smtp_password, from_email, from_name, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, name, smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName, isDefault ? 1 : 0);
  
  return { success: true, id };
});

// Form response operations
ipcMain.handle('get-responses', (event, campaignId) => {
  const stmt = db.prepare('SELECT * FROM form_responses WHERE campaign_id = ? ORDER BY submitted_at DESC');
  return stmt.all(campaignId);
});

ipcMain.handle('save-response', (event, data) => {
  const { campaignId, contactEmail, responseData, ipAddress } = data;
  const id = uuidv4();
  
  const stmt = db.prepare('INSERT INTO form_responses (id, campaign_id, contact_email, response_data, ip_address) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, campaignId, contactEmail, JSON.stringify(responseData), ipAddress || '');
  
  return { success: true, id };
});

// Campaign scheduling
ipcMain.handle('schedule-campaign', async (event, data) => {
  try {
    const { campaignId, scheduledFor } = data;
    
    db.prepare('UPDATE campaigns SET scheduled_for = ?, status = ? WHERE id = ?')
      .run(scheduledFor, 'SCHEDULED', campaignId);
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Send campaign emails
ipcMain.handle('send-campaign', async (event, data) => {
  try {
    const { campaignId, contactIds, emailConfigId } = data;
    const nodemailer = require('nodemailer');
    
    // Get campaign
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(campaignId);
    if (!campaign) {
      return { success: false, error: 'Campaign not found' };
    }
    
    // Get email config
    let emailConfig;
    if (emailConfigId) {
      emailConfig = db.prepare('SELECT * FROM email_configs WHERE id = ?').get(emailConfigId);
    } else {
      emailConfig = db.prepare('SELECT * FROM email_configs WHERE is_default = 1').get();
    }
    
    if (!emailConfig) {
      return { success: false, error: 'No email configuration found' };
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp_host,
      port: emailConfig.smtp_port,
      secure: emailConfig.smtp_port === 465,
      auth: {
        user: emailConfig.smtp_user,
        pass: emailConfig.smtp_password
      }
    });
    
    // Get contacts
    const contacts = db.prepare('SELECT * FROM contacts WHERE id IN (' + contactIds.map(() => '?').join(',') + ')')
      .all(...contactIds);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const contact of contacts) {
      try {
        const formUrl = `https://localhost:3000/form/${campaignId}/${contact.id}`;
        
        const mailOptions = {
          from: `"${emailConfig.from_name}" <${emailConfig.from_email}>`,
          to: contact.email,
          subject: campaign.subject_line || campaign.name,
          html: `
            <p>Hello ${contact.first_name || ''},</p>
            <p>Please complete the following form:</p>
            <p><a href="${formUrl}">Click here to open the form</a></p>
            <br>
            <div>${campaign.form_html}</div>
          `
        };
        
        await transporter.sendMail(mailOptions);
        
        // Record email sent
        db.prepare('INSERT INTO campaign_emails (id, campaign_id, contact_id) VALUES (?, ?, ?)')
          .run(uuidv4(), campaignId, contact.id);
        
        successCount++;
      } catch (error) {
        console.error('Failed to send to:', contact.email, error);
        failCount++;
      }
    }
    
    // Update campaign status
    db.prepare('UPDATE campaigns SET status = ?, sent_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('SENT', campaignId);
    
    return { 
      success: true, 
      sent: successCount,
      failed: failCount
    };
  } catch (error) {
    console.error('Send campaign error:', error);
    return { success: false, error: error.message };
  }
});

// CSV Import - accepts array of contact objects from frontend
ipcMain.handle('import-contacts-csv', async (event, contacts) => {
  try {
    if (!contacts || contacts.length === 0) {
      return { success: false, error: 'No contacts provided' };
    }

    const stmt = db.prepare('INSERT OR IGNORE INTO contacts (id, email, first_name, last_name, company, phone) VALUES (?, ?, ?, ?, ?, ?)');

    let imported = 0;
    let skipped = 0;

    const transaction = db.transaction((rows) => {
      for (const row of rows) {
        if (!row.email) {
          skipped++;
          continue;
        }

        try {
          stmt.run(
            uuidv4(),
            row.email,
            row.firstname || row.first_name || row['first name'] || '',
            row.lastname || row.last_name || row['last name'] || '',
            row.company || '',
            row.phone || ''
          );
          imported++;
        } catch (error) {
          log('error', 'Failed to import contact:', error.message);
          skipped++;
        }
      }
    });

    transaction(contacts);

    log('info', `CSV Import completed: ${imported} imported, ${skipped} skipped`);
    return { success: true, count: imported, imported, skipped };
  } catch (error) {
    log('error', 'CSV import error:', error);
    return { success: false, error: error.message };
  }
});

// Email Templates
ipcMain.handle('get-email-templates', (event, userId) => {
  const stmt = db.prepare('SELECT * FROM email_templates WHERE created_by = ? OR is_public = 1 ORDER BY created_at DESC');
  return stmt.all(userId);
});

ipcMain.handle('create-email-template', (event, data) => {
  const { name, subject, htmlContent, userId, isPublic } = data;
  const id = uuidv4();
  
  const stmt = db.prepare('INSERT INTO email_templates (id, name, subject, html_content, created_by, is_public) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, name, subject, htmlContent, userId, isPublic ? 1 : 0);
  
  logAudit(userId, 'CREATE_TEMPLATE', 'email_template', id, `Created template: ${name}`);
  
  return { success: true, id };
});

ipcMain.handle('delete-email-template', (event, id) => {
  const stmt = db.prepare('DELETE FROM email_templates WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

// Campaign Templates
ipcMain.handle('get-campaign-templates', (event, filters) => {
  let query = 'SELECT * FROM campaign_templates';
  let params = [];

  if (filters && filters.category) {
    query += ' WHERE category = ?';
    params.push(filters.category);
  }

  query += ' ORDER BY is_system DESC, created_at DESC';

  const stmt = db.prepare(query);
  return params.length > 0 ? stmt.all(...params) : stmt.all();
});

ipcMain.handle('create-campaign-template', (event, data) => {
  const { name, description, category, htmlContent, thumbnail, userId } = data;
  const id = uuidv4();

  const stmt = db.prepare('INSERT INTO campaign_templates (id, name, description, category, html_content, thumbnail, is_system, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  stmt.run(id, name, description, category, htmlContent, thumbnail || null, 0, userId);

  logAudit(userId, 'CREATE_CAMPAIGN_TEMPLATE', 'campaign_template', id, `Created campaign template: ${name}`);

  return { success: true, id };
});

ipcMain.handle('delete-campaign-template', (event, data) => {
  const { id, userId } = data;

  // Prevent deletion of system templates
  const template = db.prepare('SELECT is_system FROM campaign_templates WHERE id = ?').get(id);
  if (template && template.is_system === 1) {
    return { success: false, error: 'Cannot delete system templates' };
  }

  const stmt = db.prepare('DELETE FROM campaign_templates WHERE id = ? AND created_by = ?');
  const result = stmt.run(id, userId);

  if (result.changes > 0) {
    logAudit(userId, 'DELETE_CAMPAIGN_TEMPLATE', 'campaign_template', id, 'Deleted campaign template');
    return { success: true };
  }

  return { success: false, error: 'Template not found or unauthorized' };
});

// Contact Lists
ipcMain.handle('get-contact-lists', (event, userId) => {
  const stmt = db.prepare(`
    SELECT cl.*, COUNT(clm.contact_id) as contact_count 
    FROM contact_lists cl 
    LEFT JOIN contact_list_members clm ON cl.id = clm.list_id 
    WHERE cl.created_by = ? 
    GROUP BY cl.id
    ORDER BY cl.created_at DESC
  `);
  return stmt.all(userId);
});

ipcMain.handle('create-contact-list', (event, data) => {
  const { name, description, userId } = data;
  const id = uuidv4();
  
  const stmt = db.prepare('INSERT INTO contact_lists (id, name, description, created_by) VALUES (?, ?, ?, ?)');
  stmt.run(id, name, description, userId);
  
  return { success: true, id };
});

ipcMain.handle('add-contacts-to-list', (event, data) => {
  const { listId, contactIds } = data;
  
  const stmt = db.prepare('INSERT OR IGNORE INTO contact_list_members (id, list_id, contact_id) VALUES (?, ?, ?)');
  
  const transaction = db.transaction((ids) => {
    for (const contactId of ids) {
      stmt.run(uuidv4(), listId, contactId);
    }
  });
  
  transaction(contactIds);
  
  return { success: true, count: contactIds.length };
});

ipcMain.handle('get-list-contacts', (event, listId) => {
  const stmt = db.prepare(`
    SELECT c.* 
    FROM contacts c
    INNER JOIN contact_list_members clm ON c.id = clm.contact_id
    WHERE clm.list_id = ?
  `);
  return stmt.all(listId);
});

// Export responses to CSV
ipcMain.handle('export-responses-csv', async (event, campaignId) => {
  try {
    const Papa = require('papaparse');
    
    const responses = db.prepare('SELECT * FROM form_responses WHERE campaign_id = ?').all(campaignId);
    
    const data = responses.map(r => ({
      contact_email: r.contact_email,
      submitted_at: r.submitted_at,
      ...JSON.parse(r.response_data)
    }));
    
    const csv = Papa.unparse(data);
    
    return { success: true, csv };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Campaign Analytics
ipcMain.handle('get-campaign-analytics', (event, campaignId) => {
  try {
    const emails = db.prepare('SELECT * FROM campaign_emails WHERE campaign_id = ?').all(campaignId);
    const responses = db.prepare('SELECT * FROM form_responses WHERE campaign_id = ?').all(campaignId);
    
    const totalSent = emails.length;
    const totalOpened = emails.filter(e => e.opened).length;
    const totalClicked = emails.filter(e => e.clicked).length;
    const totalResponses = responses.length;
    
    return {
      totalSent,
      totalOpened,
      totalClicked,
      totalResponses,
      openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(2) : 0,
      clickRate: totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(2) : 0,
      responseRate: totalSent > 0 ? ((totalResponses / totalSent) * 100).toFixed(2) : 0
    };
  } catch (error) {
    return { error: error.message };
  }
});

// Audit logging helper
function logAudit(userId, action, entityType, entityId, details) {
  const id = uuidv4();
  db.prepare('INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, userId, action, entityType, entityId, details);
}

// User management
ipcMain.handle('get-users', () => {
  const stmt = db.prepare('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC');
  return stmt.all();
});

ipcMain.handle('create-user', async (event, data) => {
  const { name, email, password, role } = data;
  const id = uuidv4();
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const stmt = db.prepare('INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, email, name, hashedPassword, role);
  
  return { success: true, id };
});

ipcMain.handle('delete-user', (event, id) => {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  stmt.run(id);
  return { success: true };
});

// ===== NEW FEATURES =====

// Quit app (for TOS decline)
ipcMain.handle('quit-app', () => {
  app.quit();
});

// Open logs folder
ipcMain.handle('open-logs', () => {
  const { shell } = require('electron');
  shell.openPath(logDir);
  return { success: true, path: logDir };
});

// Get log file path
ipcMain.handle('get-log-path', () => {
  return { logFile, logDir };
});

// Complete setup wizard
ipcMain.handle('complete-setup', async (event, data) => {
  const setupTransaction = db.transaction(() => {
    try {
      const { companyName, name, email, password, brandColor, logoData, smtp, csvData, deviceContacts } = data;

      console.log('[SETUP] Starting setup for:', email);

      // Create owner account
      const userId = uuidv4();
      const hashedPassword = bcrypt.hashSync(password, 10);

      db.prepare('INSERT INTO users (id, email, name, password, role) VALUES (?, ?, ?, ?, ?)')
        .run(userId, email, name, hashedPassword, 'OWNER');

      console.log('[SETUP] Owner account created:', userId);

      // Save company settings
      db.prepare(`
        INSERT OR REPLACE INTO company_settings (id, company_name, company_logo, brand_color, tos_accepted, tos_accepted_date, tos_version)
        VALUES ('default', ?, ?, ?, 1, ?, '3.0')
      `).run(companyName || 'FICOS', logoData || null, brandColor || '#667eea', new Date().toISOString());

      console.log('[SETUP] Company settings saved');

      // Save SMTP config if provided
      if (smtp && smtp.host) {
        const configId = uuidv4();
        db.prepare(`
          INSERT INTO email_configs (id, name, smtp_host, smtp_port, smtp_user, smtp_password, from_email, from_name, is_default)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
        `).run(configId, 'Default', smtp.host, smtp.port, smtp.user, smtp.password, smtp.user, smtp.fromName || companyName);

        console.log('[SETUP] SMTP config saved');
      }

      // Import CSV contacts if provided
      if (csvData) {
        const Papa = require('papaparse');
        const parsed = Papa.parse(csvData, { header: true });

        let contactCount = 0;
        for (const row of parsed.data) {
          if (row.email) {
            const contactId = uuidv4();
            try {
              db.prepare('INSERT INTO contacts (id, email, first_name, last_name, company, phone) VALUES (?, ?, ?, ?, ?, ?)')
                .run(contactId, row.email, row.first_name || row.name || '', row.last_name || '', row.company || '', row.phone || '');
              contactCount++;
            } catch (err) {
              console.error('[SETUP] Error importing contact:', err);
            }
          }
        }

        console.log('[SETUP] Imported', contactCount, 'CSV contacts');
      }

      // Import device contacts if provided
      if (deviceContacts && deviceContacts.length > 0) {
        let deviceContactCount = 0;
        for (const contact of deviceContacts) {
          if (contact.email) {
            const contactId = uuidv4();
            try {
              db.prepare('INSERT INTO contacts (id, email, first_name, company, phone) VALUES (?, ?, ?, ?, ?)')
                .run(contactId, contact.email, contact.name || '', contact.company || '', contact.phone || '');
              deviceContactCount++;
            } catch (err) {
              console.error('[SETUP] Error importing device contact:', err);
            }
          }
        }

        console.log('[SETUP] Imported', deviceContactCount, 'device contacts');
      }

      logAudit(userId, 'SETUP_COMPLETED', 'SYSTEM', 'setup', 'Initial setup completed');

      console.log('[SETUP] Setup completed successfully');

      return { success: true, userId };
    } catch (error) {
      console.error('[SETUP] Setup transaction error:', error);
      throw error;
    }
  });

  try {
    const result = setupTransaction();

    // Force database to flush to disk
    db.pragma('wal_checkpoint(TRUNCATE)');

    console.log('[SETUP] Database checkpointed and flushed');

    return result;
  } catch (error) {
    console.error('[SETUP] Fatal setup error:', error);
    return { success: false, error: error.message };
  }
});

// Request device contacts permission (Electron doesn't have direct access, but we can use system dialogs)
ipcMain.handle('request-contacts-permission', async () => {
  // Electron doesn't have direct access to system contacts
  // This would require platform-specific implementation
  // For now, we'll return false and users can use CSV import
  return false;
});

ipcMain.handle('get-device-contacts', async () => {
  // Not implemented - would require platform-specific code
  return [];
});

// User Invitations
ipcMain.handle('invite-user', async (event, data) => {
  try {
    const { email, role, invitedBy } = data;
    
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return { success: false, error: 'User with this email already exists' };
    }
    
    // Check for existing pending invitation
    const pendingInvite = db.prepare('SELECT id FROM user_invitations WHERE email = ? AND accepted = 0').get(email);
    if (pendingInvite) {
      return { success: false, error: 'Invitation already sent to this email' };
    }
    
    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const inviteId = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    db.prepare(`
      INSERT INTO user_invitations (id, email, role, token, invited_by, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(inviteId, email, role, token, invitedBy, expiresAt);
    
    // Generate invitation link (this would be sent via email in production)
    const inviteLink = `ficos://invite/${token}`;
    
    logAudit(invitedBy, 'USER_INVITED', 'USER', inviteId, `Invited ${email} as ${role}`);
    
    return {
      success: true,
      inviteId,
      inviteLink,
      token,
      message: 'Invitation created. Share this link with the user.'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-invitations', (event, filters = {}) => {
  try {
    let query = 'SELECT * FROM user_invitations WHERE 1=1';
    const params = [];
    
    if (filters.pending) {
      query += ' AND accepted = 0 AND datetime(expires_at) > datetime("now")';
    }
    
    query += ' ORDER BY created_at DESC';
    
    const stmt = db.prepare(query);
    return stmt.all(...params);
  } catch (error) {
    return [];
  }
});

ipcMain.handle('accept-invitation', async (event, token) => {
  try {
    const invite = db.prepare('SELECT * FROM user_invitations WHERE token = ?').get(token);
    
    if (!invite) {
      return { success: false, error: 'Invalid invitation token' };
    }
    
    if (invite.accepted) {
      return { success: false, error: 'Invitation already accepted' };
    }
    
    if (new Date(invite.expires_at) < new Date()) {
      return { success: false, error: 'Invitation has expired' };
    }
    
    return {
      success: true,
      invitation: {
        email: invite.email,
        role: invite.role
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('revoke-invitation', (event, inviteId) => {
  try {
    db.prepare('DELETE FROM user_invitations WHERE id = ?').run(inviteId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Owner Oversight Dashboard
ipcMain.handle('get-owner-dashboard', (event) => {
  try {
    // Get all users and their recent activity
    const users = db.prepare(`
      SELECT u.id, u.email, u.name, u.role, u.last_login, u.created_at,
             COUNT(DISTINCT c.id) as campaigns_created,
             COUNT(DISTINCT al.id) as total_actions
      FROM users u
      LEFT JOIN campaigns c ON u.id = c.created_by
      LEFT JOIN audit_logs al ON u.id = al.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `).all();
    
    // Get recent activity across all users
    const recentActivity = db.prepare(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 100
    `).all();
    
    // Get system stats
    const stats = {
      totalUsers: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      totalCampaigns: db.prepare('SELECT COUNT(*) as count FROM campaigns').get().count,
      totalContacts: db.prepare('SELECT COUNT(*) as count FROM contacts').get().count,
      totalResponses: db.prepare('SELECT COUNT(*) as count FROM form_responses').get().count,
      pendingInvitations: db.prepare('SELECT COUNT(*) as count FROM user_invitations WHERE accepted = 0').get().count
    };
    
    return {
      success: true,
      users,
      recentActivity,
      stats
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-user-activity', (event, userId) => {
  try {
    const activity = db.prepare(`
      SELECT * FROM audit_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 500
    `).all(userId);
    
    const user = db.prepare('SELECT id, email, name, role FROM users WHERE id = ?').get(userId);
    
    return {
      success: true,
      user,
      activity
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Company Settings
ipcMain.handle('get-company-settings', () => {
  try {
    const settings = db.prepare('SELECT * FROM company_settings WHERE id = "default"').get();
    return settings || {
      company_name: '',
      brand_color: '#667eea',
      company_logo: null
    };
  } catch (error) {
    return {
      company_name: '',
      brand_color: '#667eea',
      company_logo: null
    };
  }
});

ipcMain.handle('update-company-settings', (event, data) => {
  try {
    const { companyName, brandColor, companyLogo } = data;
    
    db.prepare(`
      INSERT OR REPLACE INTO company_settings (id, company_name, brand_color, company_logo, updated_at)
      VALUES ('default', ?, ?, ?, ?)
    `).run(companyName, brandColor, companyLogo, new Date().toISOString());
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// App initialization
app.whenReady().then(() => {
  initDatabase();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) {
      console.log('[DATABASE] Closing database on window-all-closed');
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
    }
    app.quit();
  }
});

// Cleanup on quit
app.on('before-quit', () => {
  if (db) {
    console.log('[DATABASE] Closing database on before-quit');
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.close();
      console.log('[DATABASE] Database closed successfully');
    } catch (error) {
      console.error('[DATABASE] Error closing database:', error);
    }
  }
});
