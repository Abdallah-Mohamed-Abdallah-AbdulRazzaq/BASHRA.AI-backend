# 🚀 Production Deployment Checklist

## ✅ التغييرات المطلوبة للـ Production

### 🔴 حرجة (يجب تطبيقها):

#### 1. Environment Variables
```env
NODE_ENV=production
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=strong_password
FRONTEND_URL=https://bashra.ai
```

#### 2. Secrets قوية
```bash
# توليد secrets:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# استخدم الناتج في:
SECRET_KEY=...
SESSION_SECRET=...
```

#### 3. Redis Server
```bash
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

#### 4. PM2 Process Manager
```bash
npm install -g pm2
pm2 start app.js --name bashra-api -i max
pm2 save
pm2 startup
```

#### 5. Nginx Reverse Proxy
```bash
sudo apt install nginx
# إعداد config في /etc/nginx/sites-available/
```

#### 6. SSL Certificate
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.bashra.ai
```

---

### 🟠 موصى بها:

- ✅ Log rotation (winston-daily-rotate-file)
- ✅ Compression middleware
- ✅ Database backups
- ✅ Monitoring setup
- ✅ Firewall configuration

---

## 📝 ملف .env للـ Production

```env
NODE_ENV=production
PORT=3006
BASE_URL=https://api.bashra.ai

DB_HOST=localhost
DB_USER=bashra_prod
DB_PASSWORD=your_strong_password
DB_NAME=bashra_production

SECRET_KEY=your_64_char_secret
SESSION_SECRET=your_64_char_secret

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

FRONTEND_URL=https://bashra.ai
```

---

**راجع:** `docs/17-app-js-analysis/08-PRODUCTION_DEPLOYMENT_GUIDE.md` للتفاصيل الكاملة
