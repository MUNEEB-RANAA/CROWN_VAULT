'use strict';
const fs=require('node:fs');
const path=require('node:path');
const email=process.argv[2]?.trim().toLowerCase();
if(!email){console.error('Usage: node scripts/set-admin.js registered-email');process.exit(1);}
const file=process.env.CV_DATA_FILE || path.join(__dirname,'../data/db.json');
const db=JSON.parse(fs.readFileSync(file,'utf8'));
const user=db.users.find(user=>user.email===email);
if(!user){console.error('Register this account first.');process.exit(1);}
user.role='admin';fs.writeFileSync(file+'.tmp',JSON.stringify(db,null,2));fs.renameSync(file+'.tmp',file);
console.log('Administrator role assigned. Restart the server and sign in.');
