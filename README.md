# 🌾 Lust auf Landwirtschaft - Virtueller Farming Simulator

Eine vollständige virtuelle Landwirtschafts-Plattform, die es Benutzern ermöglicht, echte Parzellen zu pachten, landwirtschaftliche Entscheidungen zu treffen und ihre Entscheidungen auf echtem Land implementieren zu lassen.

## ✨ Features

### 🚜 **Kernfunktionalitäten**
- **Parzellen-Leasing**: Wählen Sie aus verschiedenen 250m² Plots mit unterschiedlichen Bodentypen
- **Landwirtschaftsplanung**: Entscheiden Sie über Anbaumethoden, Kulturen und Maschineneinsatz  
- **Düngung**: Wählen Sie zwischen mineralischen und organischen Düngemitteln
- **PayPal-Integration**: Sichere Zahlungsabwicklung
- **Ertragsschätzung**: Basierend auf Bodenqualität und gewählten Kulturen
- **Bestellverfolgung**: Überblick über aktive Farming-Projekte

### 🌱 **Verfügbare Kulturen**
- Getreide: Weizen, Roggen, Gerste, Triticale
- Spezialkluturen: Silomais, Zuckerrüben, Erbsen
- Dauergrünland: Luzerne, Gras
- Blühmischungen für Biodiversität

## 🏗️ Technische Architektur

### **Frontend** (React + Tailwind CSS)
- React 19 mit modernem Hook-basiertem Design  
- Tailwind CSS für responsive, mobile-first UI
- PayPal React SDK für sichere Zahlungen
- Axios für API-Kommunikation
- Craco für erweiterte Build-Konfiguration

### **Backend** (FastAPI + MongoDB)
- FastAPI für hochperformante REST APIs
- MongoDB für flexible Datenstrukturierung  
- PayPal Server SDK für Zahlungsverarbeitung
- Pydantic für Datenvalidierung
- UUID-basierte IDs für bessere Skalierung

## 🚀 Deployment-Modi

### **Demo-Modus** (Aktuelle Netlify-Deployment)
- ✅ Frontend-only Deployment
- ✅ Verwendung von Mock-Daten
- ✅ Alle UI-Features funktional
- ⚠️ Keine echten Backend-Operationen
- ⚠️ Keine Datenpersistierung

### **Vollständiges Deployment**
Für eine vollständige Implementierung benötigen Sie:

1. **Backend-Deployment** (Railway, Heroku, DigitalOcean, etc.)
2. **MongoDB-Datenbank** (MongoDB Atlas empfohlen)  
3. **PayPal-Geschäftskonto** für Live-Zahlungen
4. **Domain-Konfiguration** für CORS-Einstellungen

## 📦 Installation & Setup

### **Lokale Entwicklung**
```bash
# Repository klonen
git clone https://github.com/Sonne1997/farming-simulator1.git
cd farming-simulator1

# Backend Setup
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 0.0.0.0 --port 8001

# Frontend Setup (neues Terminal)
cd frontend  
yarn install
yarn start
```

### **Umgebungsvariablen**

#### Frontend (.env)
```env
REACT_APP_BACKEND_URL=http://localhost:8001
REACT_APP_PAYPAL_CLIENT_ID=your-paypal-client-id
REACT_APP_DEMO_MODE=false
```

#### Backend (.env)
```env
MONGO_URL=mongodb://localhost:27017/farming_simulator
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-secret
PAYPAL_ENVIRONMENT=sandbox
```

## 🌐 Live Demo

**Demo-Version:** https://spiel.lustauflandwirtschaft.de/

> ⚠️ **Hinweis:** Die Demo-Version läuft im Frontend-only Modus mit Beispieldaten zur Demonstration der Benutzeroberfläche und Features.

## 🔧 Entwickler-Informationen

### **API-Endpunkte**
- `GET /api/plots` - Verfügbare Parzellen abrufen
- `GET /api/machines` - Landmaschinen nach Arbeitsschritt
- `GET /api/fertilizer-specs` - Düngemittel-Spezifikationen
- `POST /api/orders` - Neue Bestellung erstellen
- `POST /api/payments/create-paypal-order` - PayPal-Zahlung initiieren

### **Datenmodelle**
- **Plot**: Parzellen-Informationen (Größe, Bodentyp, Preis)
- **Machine**: Landmaschinen (Typ, Arbeitsschritt, Kosten)
- **Order**: Bestellungen (Plot, Entscheidungen, Zahlungsstatus)
- **FarmingDecision**: Landwirtschaftliche Entscheidungen

## 🏆 Features & Highlights

- 📱 **Vollständig responsive** für mobile und Desktop-Nutzung
- 🎨 **Moderne UI/UX** mit Tailwind CSS
- 🔒 **Sichere Zahlungen** mit PayPal-Integration
- 🌍 **Deutsche Lokalisierung** für landwirtschaftliche Begriffe
- ⚡ **Hochperformant** mit React 19 und FastAPI
- 🧪 **Umfangreich getestet** mit automatisierten Tests

## 📝 Lizenz

MIT License - Siehe [LICENSE](LICENSE) für Details.

## 👨‍💻 Entwicklung

Dieses Projekt wurde entwickelt von [Sonne1997](https://github.com/Sonne1997) als moderne Full-Stack-Webanwendung für virtuelle Landwirtschaftserfahrungen.

---

**Status:** ✅ Demo-Version online • 🚧 Full-Stack-Deployment in Vorbereitung
