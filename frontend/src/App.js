import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import WeatherWidget from './components/WeatherWidget';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = BACKEND_URL ? `${BACKEND_URL}/api` : null;
const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID;
const DEMO_MODE = process.env.REACT_APP_DEMO_MODE === 'true' || !BACKEND_URL;

// Mock data for demo mode
const MOCK_PLOTS = [
  {
    id: "plot_001",
    name: "A1 - Ritterfeld",
    location: "39291 Grabow",
    size_m2: 250,
    soil_type: "sand",
    soil_points: 28,
    lease_price_per_year: 7.0,
    available: true
  },
  {
    id: "plot_002",
    name: "B2 - Ritterfeld", 
    location: "39291 Grabow",
    size_m2: 250,
    soil_type: "loamy_sand",
    soil_points: 38,
    lease_price_per_year: 9.5,
    available: true
  },
  {
    id: "plot_003",
    name: "C3 - Ritterfeld",
    location: "39291 Grabow", 
    size_m2: 250,
    soil_type: "clayey_sand",
    soil_points: 42,
    lease_price_per_year: 10.5,
    available: true
  },
  {
    id: "plot_004",
    name: "D4 - Ritterfeld",
    location: "39291 Grabow",
    size_m2: 250,
    soil_type: "sandy_loam",
    soil_points: 48,
    lease_price_per_year: 12.0,
    available: true
  },
  {
    id: "plot_005", 
    name: "E5 - Ritterfeld",
    location: "39291 Grabow",
    size_m2: 250,
    soil_type: "clayey_loam",
    soil_points: 52,
    lease_price_per_year: 13.0,
    available: true
  }
];

const MOCK_MACHINES = []; // Empty in live mode

const MOCK_EXPECTED_YIELDS = {}; // Empty in live mode

const MOCK_FERTILIZER_SPECS = {}; // Empty in live mode

const App = () => {
  const [currentStep, setCurrentStep] = useState('plots');
  const [plots, setPlots] = useState([]);
  const [machines, setMachines] = useState([]);
  const [machinesByStep, setMachinesByStep] = useState({});
  const [fertilizerSpecs, setFertilizerSpecs] = useState({});
  const [marketPrices, setMarketPrices] = useState({});
  const [expectedYields, setExpectedYields] = useState({});
  const [marketValues, setMarketValues] = useState({});
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [farmingDecision, setFarmingDecision] = useState({
    cultivation_method: '',
    crop_type: '',
    expected_yield_kg: 0,
    fertilizer_choice: {
      fertilizer_type: '',
      amount: 0,
      cost: 0
    },
    fertilizer_method: '', // 'mineral' or 'organic'
    plant_protection: {
      herbst_herbizid: false,
      fruejahr_herbizid: false,
      insektizid: false,
      mechanisch: false
    },
    machines: {
      bodenbearbeitung: [],
      aussaat: [],
      pflanzenschutz: [],
      duengung: [],
      pflege: [],
      ernte: []
    },
    harvest_option: 'ship_home',
    shipping_address: ''
  });
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [orderToPayFor, setOrderToPayFor] = useState(null);
  const [activePlotsCount, setActivePlotsCount] = useState(0);

  useEffect(() => {
    initializeData();
  }, []);

  // Fetch expected yields when plot changes
  useEffect(() => {
    if (selectedPlot && !DEMO_MODE) {
      fetchExpectedYields();
      fetchMarketValues();
    }
  }, [selectedPlot]);

  const initializeData = async () => {
    try {
      console.log('Loading live data from API');
      
      // Initialize database first
      await axios.post(`${API}/initialize-data`);
      console.log('Database initialized');
      
      // Then load data  
      const [plotsRes, machinesRes, fertilizerRes, marketRes, ordersRes, activePlotsRes] = await Promise.all([
        axios.get(`${API}/plots`),
        axios.get(`${API}/machines`),
        axios.get(`${API}/fertilizer-specs`),
        axios.get(`${API}/market-values`),
        axios.get(`${API}/orders`),
        axios.get(`${API}/active-plots-count`)
      ]);
      
      console.log('Raw machines from API:', machinesRes.data.length);
      console.log('First 3 machine names:', machinesRes.data.slice(0,3).map(m => m.name));
      
      setPlots(plotsRes.data);
      setMachines(machinesRes.data);
      setFertilizerSpecs(fertilizerRes.data);
      setMarketPrices(marketRes.data);
      setOrders(ordersRes.data);
      setActivePlotsCount(activePlotsRes.data.active_plots);
      
      // Group machines by working step with debug info
      const machinesByStep = {
        bodenbearbeitung: machinesRes.data.filter(m => m.working_step === 'bodenbearbeitung'),
        aussaat: machinesRes.data.filter(m => m.working_step === 'aussaat'),
        pflanzenschutz: machinesRes.data.filter(m => m.working_step === 'pflanzenschutz'),
        duengung: machinesRes.data.filter(m => m.working_step === 'duengung'),
        pflege: machinesRes.data.filter(m => m.working_step === 'pflege'),
        ernte: machinesRes.data.filter(m => m.working_step === 'ernte')
      };
      
      console.log('Machines by working step:', {
        bodenbearbeitung: machinesByStep.bodenbearbeitung.length,
        aussaat: machinesByStep.aussaat.length,
        pflanzenschutz: machinesByStep.pflanzenschutz.length,
        duengung: machinesByStep.duengung.length,
        pflege: machinesByStep.pflege.length,
        ernte: machinesByStep.ernte.length
      });
      
      console.log('Bodenbearbeitung machines:', machinesByStep.bodenbearbeitung.map(m => m.name));
      
      setMachinesByStep(machinesByStep);
      
      console.log('All data loaded successfully');
    } catch (error) {
      console.error('Error initializing data:', error);
      // No fallback - force live mode only
    }
  };

  const fetchPlots = async () => {
    try {
      const response = await axios.get(`${API}/plots`);
      setPlots(response.data);
    } catch (error) {
      console.error('Error fetching plots:', error);
    }
  };



  const fetchFertilizerSpecs = async () => {
    try {
      const response = await axios.get(`${API}/fertilizer-specs`);
      setFertilizerSpecs(response.data);
    } catch (error) {
      console.error('Error fetching fertilizer specs:', error);
    }
  };

  const fetchMarketPrices = async () => {
    try {
      const response = await axios.get(`${API}/market-values`);
      setMarketPrices(response.data);
    } catch (error) {
      console.error('Error fetching market prices:', error);
    }
  };

  const fetchExpectedYields = async () => {
    try {
      if (!selectedPlot) {
        return;
      }
      
      const response = await axios.get(`${API}/expected-yields/${selectedPlot?.soil_points || 35}`);
      setExpectedYields(response.data);
    } catch (error) {
      console.error('Error fetching expected yields:', error);
    }
  };

  const fetchMarketValues = async () => {
    try {
      const response = await axios.get(`${API}/market-values`);
      setMarketValues(response.data);
    } catch (error) {
      console.error('Error fetching market values:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handlePlotSelection = (plot) => {
    setSelectedPlot(plot);
    setCurrentStep('farming');
  };

  const handleFarmingDecisionChange = (field, value) => {
    setFarmingDecision(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMachineSelection = (workingStep, machineId) => {
    setFarmingDecision(prev => ({
      ...prev,
      machines: {
        ...prev.machines,
        [workingStep]: prev.machines[workingStep].includes(machineId)
          ? prev.machines[workingStep].filter(id => id !== machineId)
          : [...prev.machines[workingStep], machineId]
      }
    }));
  };

  const handleFertilizerSelection = (fertilizerType) => {
    const specs = fertilizerSpecs[fertilizerType];
    if (!specs) return;

    let amount = 0;
    let cost = 0;

    if (specs.category === 'organic') {
      if (fertilizerType === 'rindermist') {
        // Rindermist: 3 kg N needed, 5 kg N per ton, price per ton
        amount = 3.0 / 5.0; // 0.6 tons needed
        cost = amount * specs.price_per_ton;
      } else {
        // Other organic: 1m³ per 250m²
        amount = 1.0;
        cost = specs.price_per_m3;
      }
    } else if (specs.category === 'mineral') {
      // Calculate based on nitrogen requirement (3kg N per 250m²)
      const nRequired = 3.0; // kg N per 250m²
      const nContentDecimal = specs.n_content / 100; // Convert % to decimal
      amount = nRequired / nContentDecimal; // kg needed
      cost = (amount / 1000) * specs.price_per_ton; // Convert to tons for cost
    }

    setFarmingDecision(prev => ({
      ...prev,
      fertilizer_choice: {
        fertilizer_type: fertilizerType,
        amount: amount,
        cost: cost
      }
    }));
  };

  const calculateTotalCost = () => {
    if (!selectedPlot) return 0;
    
    const plotCost = selectedPlot.price_per_plot;
    
    const allMachineIds = [
      ...farmingDecision.machines.bodenbearbeitung,
      ...farmingDecision.machines.aussaat,
      ...farmingDecision.machines.pflanzenschutz,
      ...farmingDecision.machines.duengung,
      ...farmingDecision.machines.pflege,
      ...farmingDecision.machines.ernte
    ];
    
    const machineCost = allMachineIds.reduce((total, machineId) => {
      const machine = machines.find(m => m.id === machineId);
      return total + (machine ? machine.price_per_use : 0);
    }, 0);
    
    const fertilizerCost = farmingDecision.fertilizer_choice.cost || 0;
    const shippingCost = farmingDecision.harvest_option === 'ship_home' ? 25.0 : 0;
    
    return plotCost + machineCost + fertilizerCost + shippingCost;
  };

  const getExpectedMarketValue = () => {
    if (!farmingDecision.crop_type) return 0;
    
    return marketValues[farmingDecision.crop_type] || 0;
  };

  const handleSubmitOrder = async () => {
    if (!selectedPlot || !userInfo.name || !userInfo.email) {
      alert('Bitte füllen Sie alle erforderlichen Informationen aus');
      return;
    }
    
    if (farmingDecision.harvest_option === 'ship_home' && !farmingDecision.shipping_address) {
      alert('Bitte geben Sie eine Lieferadresse an');
      return;
    }
    
    setLoading(true);
    try {
      const orderData = {
        user_name: userInfo.name,
        user_email: userInfo.email,
        user_phone: userInfo.phone,
        plot_id: selectedPlot.id,
        farming_decision: {
          ...farmingDecision,
          expected_yield_kg: expectedYields[farmingDecision.crop_type] || 0
        },
        notes: `Lust auf Landwirtschaft - ${selectedPlot.name}`
      };
      
      const response = await axios.post(`${API}/orders`, orderData);
      setOrderToPayFor(response.data);
      setShowPayment(true);
      
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Fehler beim Absenden der Bestellung. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    alert('Zahlung erfolgreich! Sie erhalten Updates zum Fortschritt Ihrer Parzelle.');
    
    // Reset form
    setCurrentStep('plots');
    setSelectedPlot(null);
    setFarmingDecision({
      cultivation_method: '',
      crop_type: '',
      expected_yield_kg: 0,
      fertilizer_choice: {
        fertilizer_type: '',
        amount: 0,
        cost: 0
      },
      plant_protection: {
        herbst_herbizid: false,
        fruejahr_herbizid: false,
        insektizid: false,
        mechanisch: false
      },
      machines: {
        bodenbearbeitung: [],
        aussaat: [],
        pflanzenschutz: [],
        duengung: [],
        pflege: [],
        ernte: []
      },
      harvest_option: 'ship_home',
      shipping_address: ''
    });
    setUserInfo({ name: '', email: '', phone: '' });
    setShowPayment(false);
    setOrderToPayFor(null);
    
    // Refresh data
    fetchPlots();
    fetchOrders();
  };

  const getGermanSoilType = (soilType) => {
    const translations = {
      'sand': 'Sandboden',
      'loamy_sand': 'Lehmiger Sandboden',
      'clayey_sand': 'Anlehmiger Sandboden',
      'sandy_loam': 'Sandiger Lehm'
    };
    return translations[soilType] || soilType;
  };

  const getGermanCropType = (cropType) => {
    const translations = {
      'winterroggen': 'Winterroggen',
      'winterweizen': 'Winterweizen',
      'wintergerste': 'Wintergerste',
      'wintertriticale': 'Wintertriticale',
      'silomais': 'Silomais',
      'zuckerrueben': 'Zuckerrüben',
      'luzerne': 'Luzerne',
      'gras': 'Gras',
      'bluehmischung': 'Blühmischung',
      'erbsen': 'Erbsen',
      'winterraps': 'Winterraps',
      'khorasan_weizen': 'Khorasan-Weizen'
    };
    return translations[cropType] || cropType;
  };

  const getGermanCultivationMethod = (method) => {
    const translations = {
      'konventionell': 'Konventionell',
      'biologisch': 'Biologisch'
    };
    return translations[method] || method;
  };

  const getGermanStatus = (status) => {
    const translations = {
      'pending': 'Ausstehend',
      'confirmed': 'Bestätigt',
      'implementing': 'Umsetzung',
      'growing': 'Wachstum',
      'harvest_ready': 'Erntereif',
      'completed': 'Abgeschlossen'
    };
    return translations[status] || status;
  };

  const getGermanWorkingStep = (step) => {
    const translations = {
      'bodenbearbeitung': 'Bodenbearbeitung',
      'aussaat': 'Aussaat',
      'pflanzenschutz': 'Pflanzenschutz',
      'duengung': 'Düngung',
      'pflege': 'Pflege',
      'ernte': 'Ernte'
    };
    return translations[step] || step;
  };

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-green-800 to-green-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6">
          <div className="flex items-center space-x-6 mb-6 md:mb-0">
            {/* Logo */}
            <div className="flex items-center space-x-4">
              <img 
                src="/logo.svg" 
                alt="Lust auf Landwirtschaft Logo" 
                className="w-20 h-20"
              />
              <div>
                <h1 className="text-4xl font-bold mb-2">Lust auf Landwirtschaft</h1>
                <p className="text-xl text-green-100">250m² Parzellen pachten • Echte Landwirtschaft erleben</p>
              </div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{activePlotsCount}</div>
            <div className="text-green-100">Aktive Parzellen</div>
          </div>
        </div>
        
        {/* Weather Widget */}
        <div className="max-w-sm">
          <WeatherWidget />
        </div>
      </div>
      
      {/* Demo Mode Notification */}
      {DEMO_MODE && (
        <div className="bg-yellow-500 text-black py-3">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-yellow-800">⚠️</span>
              <span className="font-semibold">Demo-Modus aktiv</span>
              <span>•</span>
              <span className="text-sm">Diese Version verwendet Beispieldaten zur Demonstration der Funktionalität</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderStepIndicator = () => (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-center space-x-8">
          <div className={`flex items-center space-x-2 ${currentStep === 'plots' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'plots' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>1</div>
            <span className="font-medium">Parzelle wählen</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center space-x-2 ${currentStep === 'farming' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'farming' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>2</div>
            <span className="font-medium">Landwirtschaft planen</span>
          </div>
          <div className="w-16 h-0.5 bg-gray-300"></div>
          <div className={`flex items-center space-x-2 ${currentStep === 'review' ? 'text-green-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep === 'review' ? 'bg-green-600 text-white' : 'bg-gray-300'}`}>3</div>
            <span className="font-medium">Übersicht & Bestellung</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlotSelection = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Wählen Sie Ihre 250m² Parzelle</h2>
        <p className="text-lg text-gray-600">Alle Parzellen befinden sich in 39291 Grabow</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plots.map(plot => (
          <div key={plot.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
            <div className="h-48 bg-gray-200 overflow-hidden">
              <img 
                src={plot.image_url || 'https://images.unsplash.com/photo-1529313780224-1a12b68bed16?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxmYXJtaW5nfGVufDB8fHxncmVlbnwxNzUyODI5NTkzfDA&ixlib=rb-4.1.0&q=85'} 
                alt={plot.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-2">{plot.name}</h3>
              <p className="text-gray-600 mb-4">{plot.description}</p>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Größe:</span>
                  <span className="font-medium">250m² (18m × 13,8m)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bodentyp:</span>
                  <span className="font-medium">{getGermanSoilType(plot.soil_type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Bodenpunkte:</span>
                  <span className="font-medium font-bold text-green-600">{plot.soil_points}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Standort:</span>
                  <span className="font-medium">{plot.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pachtpreis:</span>
                  <span className="font-bold text-green-600">{plot.price_per_plot}€</span>
                </div>
              </div>
              <button
                onClick={() => handlePlotSelection(plot)}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Diese Parzelle pachten
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFarmingDecisions = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Planen Sie Ihre Landwirtschaft</h2>
        <p className="text-lg text-gray-600">Entscheidungen für Ihre Parzelle: <strong>{selectedPlot?.name}</strong></p>
      </div>

      <div className="space-y-8">
        {/* Soil Quality Visualization */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🌱 Bodenqualität</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Bodenpunkte: {selectedPlot?.soil_points}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                selectedPlot?.soil_points >= 46 ? 'bg-green-100 text-green-800' :
                selectedPlot?.soil_points >= 31 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {selectedPlot?.soil_points >= 46 ? 'Hoch' :
                 selectedPlot?.soil_points >= 31 ? 'Mittel' : 'Niedrig'}
              </span>
            </div>
            
            {/* Visual Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${
                  selectedPlot?.soil_points >= 46 ? 'bg-green-500' :
                  selectedPlot?.soil_points >= 31 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min((selectedPlot?.soil_points || 0) / 60 * 100, 100)}%` }}
              ></div>
            </div>
            
            {/* Soil Quality Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span>20-30: Sandboden (niedrige Erträge)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span>31-45: Lehmiger Sand (mittlere Erträge)</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span>46-60: Lehm (hohe Erträge)</span>
              </div>
            </div>
            
            {/* Expected Yield Impact */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">💰 Auswirkung auf Erträge:</h4>
              <p className="text-sm text-gray-600">
                {selectedPlot?.soil_points >= 46 ? '🟢 Optimale Bedingungen - Erträge 15-20% über Durchschnitt' :
                 selectedPlot?.soil_points >= 31 ? '🟡 Durchschnittliche Bedingungen - normale Erträge' :
                 '🔴 Herausfordernde Bedingungen - Erträge 10-15% unter Durchschnitt'}
              </p>
            </div>
          </div>
        </div>
        {/* Season Progress Tracker */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📅 Saison-Fortschritt</h3>
          <div className="space-y-4">
            {/* Current Season Info */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-gray-700">Ihr Anbaujahr:</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                2025/2026
              </span>
            </div>
            
            {/* Progress Timeline - starts at 0% when someone buys */}
            <div className="space-y-3">
              {[
                { phase: 'Aussaat', month: 'Herbst 2025', icon: '🌱', progress: 25, status: 'upcoming' },
                { phase: 'Wachstum', month: 'Frühjahr 2026', icon: '🌾', progress: 50, status: 'upcoming' },
                { phase: 'Pflege', month: 'Sommer 2026', icon: '🚜', progress: 75, status: 'upcoming' },
                { phase: 'Ernte', month: 'Herbst 2026', icon: '🎯', progress: 100, status: 'upcoming' }
              ].map((stage, index) => (
                <div key={index} className="flex items-center space-x-4 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="text-2xl grayscale">
                    {stage.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{stage.phase}</span>
                      <span className="text-sm text-gray-500">{stage.month}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-gray-300 h-2 rounded-full transition-all duration-1000"
                        style={{ width: '0%' }}
                      ></div>
                    </div>
                  </div>
                  <div className="text-gray-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Overall Progress - starts at 0% */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-800">Gesamt-Fortschritt:</span>
                <span className="text-lg font-bold text-gray-600">0%</span>
              </div>
              <div className="w-full bg-white rounded-full h-3 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-gray-300 to-gray-400 h-3 rounded-full transition-all duration-2000"
                  style={{ width: '0%' }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                🎯 Ihr Anbaujahr beginnt nach der Buchung und Zahlung
              </p>
            </div>
          </div>
        </div>
        
        {/* Cultivation Method */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🌱 Anbaumethode</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['konventionell', 'biologisch'].map(method => (
              <label key={method} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="cultivation_method"
                  value={method}
                  checked={farmingDecision.cultivation_method === method}
                  onChange={(e) => handleFarmingDecisionChange('cultivation_method', e.target.value)}
                  className="text-green-600"
                />
                <span className="font-medium">{getGermanCultivationMethod(method)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Crop Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🌾 Kulturauswahl</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.keys(expectedYields).map(crop => (
              <label key={crop} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="crop_type"
                  value={crop}
                  checked={farmingDecision.crop_type === crop}
                  onChange={(e) => handleFarmingDecisionChange('crop_type', e.target.value)}
                  className="text-green-600"
                />
                <div className="flex-1">
                  <div className="font-medium">{getGermanCropType(crop)}</div>
                  <div className="text-sm text-gray-500">{expectedYields[crop]}kg erwartet</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Expected Harvest */}
        {farmingDecision.crop_type && (
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-2">📊 Erwartete Ernte</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-blue-600">Ertrag:</span>
                <span className="font-bold ml-2">{expectedYields[farmingDecision.crop_type] || 0}kg</span>
              </div>
              <div>
                <span className="text-blue-600">Marktwert:</span>
                <span className="font-bold ml-2">{getExpectedMarketValue().toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}

        {/* Fertilizer Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🌿 Düngung</h3>
          <div className="space-y-4">
            {/* Mineralische Düngung - nur bei konventionellem Anbau */}
            {farmingDecision.cultivation_method === 'konventionell' && (
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Mineralische Düngung</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(fertilizerSpecs).filter(([_, spec]) => spec.category === 'mineral').map(([type, spec]) => (
                  <label key={type} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="fertilizer"
                      value={type}
                      checked={farmingDecision.fertilizer_choice.fertilizer_type === type}
                      onChange={() => handleFertilizerSelection(type)}
                      className="text-green-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{spec.name}</div>
                      <div className="text-sm text-gray-500">{spec.price_per_ton}€/t</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            )}

            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Organische Düngung</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(fertilizerSpecs).filter(([_, spec]) => spec.category === 'organic').map(([type, spec]) => (
                  <label key={type} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="fertilizer"
                      value={type}
                      checked={farmingDecision.fertilizer_choice.fertilizer_type === type}
                      onChange={() => handleFertilizerSelection(type)}
                      className="text-green-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{spec.name}</div>
                      <div className="text-sm text-gray-500">{spec.price_per_m3}€/m³</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="fertilizer"
                  value="keine_duengung"
                  checked={farmingDecision.fertilizer_choice.fertilizer_type === 'keine_duengung'}
                  onChange={() => handleFertilizerSelection('keine_duengung')}
                  className="text-green-600"
                />
                <div className="flex-1">
                  <div className="font-medium">Ohne Düngung</div>
                  <div className="text-sm text-gray-500">0€</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Machine Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🚜 Maschinenauswahl</h3>
          
          <div className="space-y-6">
            {Object.entries(machinesByStep).map(([step, machines]) => {
              if (step === 'pflanzenschutz') {
                // Keine Pflanzenschutz für Gras, Luzerne und Blühmischung (realistisch)
                if (['gras', 'luzerne', 'bluehmischung'].includes(farmingDecision.crop_type)) {
                  return (
                    <div key={step}>
                      <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-xl font-bold text-gray-800 mb-4">🛡️ Pflanzenschutz</h3>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-sm">✓</span>
                            </div>
                            <div>
                              <h4 className="font-medium text-green-800">Kein Pflanzenschutz erforderlich</h4>
                              <p className="text-sm text-green-600 mt-1">
                                {farmingDecision.crop_type === 'gras' && 'Gras ist sehr robust und benötigt normalerweise keinen Pflanzenschutz.'}
                                {farmingDecision.crop_type === 'luzerne' && 'Luzerne ist eine sehr widerstandsfähige Leguminose ohne Pflanzenschutzbedarf.'}
                                {farmingDecision.crop_type === 'bluehmischung' && 'Blühmischungen sind natürlich und benötigen keinen Pflanzenschutz.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={step}>
                    <h4 className="text-lg font-semibold text-gray-700 mb-3">🌱 {getGermanWorkingStep(step)}</h4>
                    
                    {farmingDecision.cultivation_method === 'biological' ? (
                      // Biologischer Pflanzenschutz - nur mechanisch
                      <div>
                        <p className="text-sm text-green-600 mb-3">Biologische Landwirtschaft - Nur mechanischer Pflanzenschutz möglich</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {machines.filter(m => m.treatment_type === 'mechanisch').map(machine => (
                            <label key={machine.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={farmingDecision.machines[step].includes(machine.id)}
                                onChange={() => handleMachineSelection(step, machine.id)}
                                className="text-green-600"
                              />
                              <div className="flex-1">
                                <div className="font-medium">{machine.name}</div>
                                <div className="text-sm text-gray-500">{machine.specifications}</div>
                                <div className="text-sm text-gray-500">{(machine.price_per_use || machine.cost_per_hectare || 0).toFixed(1)}€/ha</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    ) : (
                      // Konventioneller Pflanzenschutz
                      <div className="space-y-4">
                        {/* Herbstbehandlung für alle Winterkulturen */}
                        {farmingDecision.crop_type.startsWith('winter') && (
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">
                              🍂 Herbstbehandlung 
                              {farmingDecision.crop_type === 'wintergerste' && <span className="text-orange-600"> (Blattläuse - EMPFOHLEN)</span>}
                              {farmingDecision.crop_type === 'winterraps' && <span className="text-red-600"> (Erdfloh - WICHTIG)</span>}
                              {(farmingDecision.crop_type === 'winterweizen' || farmingDecision.crop_type === 'winterroggen' || farmingDecision.crop_type === 'wintertriticale') && <span className="text-blue-600"> (Unkräuter)</span>}
                            </h5>
                            <div className="grid grid-cols-1 gap-4">
                              {/* Herbizid für Getreide/Raps */}
                              {machines.filter(m => m.season === 'herbst' && m.treatment_type === 'herbizid').map(machine => (
                                <label key={machine.id} className="flex items-center space-x-3 p-3 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-50">
                                  <input
                                    type="checkbox"
                                    checked={farmingDecision.machines[step].includes(machine.id)}
                                    onChange={() => handleMachineSelection(step, machine.id)}
                                    className="text-orange-600"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{machine.name}</div>
                                    <div className="text-sm text-gray-500">{machine.specifications}</div>
                                    <div className="text-sm text-gray-500">{(machine.price_per_use || machine.cost_per_hectare || 0).toFixed(1)}€/ha</div>
                                  </div>
                                </label>
                              ))}
                              
                              {/* Insektizid für Wintergerste und Winterraps */}
                              {(farmingDecision.crop_type === 'wintergerste' || farmingDecision.crop_type === 'winterraps') && 
                                machines.filter(m => m.treatment_type === 'insektizid').map(machine => (
                                <label key={`herbst-${machine.id}`} className="flex items-center space-x-3 p-3 border border-red-200 rounded-lg cursor-pointer hover:bg-red-50">
                                  <input
                                    type="checkbox"
                                    checked={farmingDecision.machines[step].includes(machine.id)}
                                    onChange={() => handleMachineSelection(step, machine.id)}
                                    className="text-red-600"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{machine.name}</div>
                                    <div className="text-sm text-gray-500">
                                      {farmingDecision.crop_type === 'wintergerste' ? 'Gegen Blattläuse im Herbst' : 'Gegen Erdfloh nach Auflaufen'}
                                    </div>
                                    <div className="text-sm text-gray-500">{(machine.price_per_use || machine.cost_per_hectare || 0).toFixed(1)}€/ha</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Frühjahrsbehandlung */}
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">🌸 Frühjahrsbehandlung</h5>
                          <div className="grid grid-cols-1 gap-4">
                            {machines.filter(m => m.season === 'fruejahr' && m.treatment_type === 'herbizid').map(machine => (
                              <label key={machine.id} className="flex items-center space-x-3 p-3 border border-green-200 rounded-lg cursor-pointer hover:bg-green-50">
                                <input
                                  type="checkbox"
                                  checked={farmingDecision.machines[step].includes(machine.id)}
                                  onChange={() => handleMachineSelection(step, machine.id)}
                                  className="text-green-600"
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{machine.name}</div>
                                  <div className="text-sm text-gray-500">{machine.specifications}</div>
                                  <div className="text-sm text-gray-500">{(machine.price_per_use || machine.cost_per_hectare || 0).toFixed(1)}€/ha</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                        
                        {/* Kulturspezifische Behandlungen */}
                        {farmingDecision.crop_type === 'zuckerrueben' && (
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">🍬 Zuckerrüben-spezifische Behandlungen (INTENSIV)</h5>
                            <div className="grid grid-cols-1 gap-4">
                              {machines.filter(m => m.crop_specific === 'zuckerrueben').map(machine => (
                                <label key={machine.id} className="flex items-center space-x-3 p-3 border border-purple-200 rounded-lg cursor-pointer hover:bg-purple-50">
                                  <input
                                    type="checkbox"
                                    checked={farmingDecision.machines[step].includes(machine.id)}
                                    onChange={() => handleMachineSelection(step, machine.id)}
                                    className="text-purple-600"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{machine.name}</div>
                                    <div className="text-sm text-gray-500">{machine.specifications}</div>
                                    <div className="text-sm font-semibold text-purple-600">{(machine.price_per_use || machine.cost_per_hectare || 0).toFixed(1)}€/ha</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 p-3 bg-purple-50 rounded-lg">
                              <p className="text-sm text-purple-700">
                                <strong>💡 Zuckerrüben-Info:</strong> Sehr intensive Kultur mit hohem Pflanzenschutzaufwand. 
                                Gesamtkosten: ca. 468€/ha für alle Behandlungen.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Silomais Behandlungen */}
                        {farmingDecision.crop_type === 'silomais' && (
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">🌽 Silomais-Behandlungen</h5>
                            <div className="grid grid-cols-1 gap-4">
                              {machines.filter(m => m.crop_specific === 'silomais').map(machine => (
                                <label key={machine.id} className="flex items-center space-x-3 p-3 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-50">
                                  <input
                                    type="checkbox"
                                    checked={farmingDecision.machines[step].includes(machine.id)}
                                    onChange={() => handleMachineSelection(step, machine.id)}
                                    className="text-yellow-600"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{machine.name}</div>
                                    <div className="text-sm text-gray-500">{machine.specifications}</div>
                                    <div className="text-sm font-semibold text-yellow-600">{(machine.price_per_use || machine.cost_per_hectare || 0).toFixed(1)}€/ha</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 p-3 bg-yellow-50 rounded-lg">
                              <p className="text-sm text-yellow-700">
                                <strong>💡 Silomais-Info:</strong> Insektizidbehandlung meist nicht notwendig. 
                                Gesamtkosten: ca. 60€/ha.
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {/* Erbsen Behandlungen */}
                        {farmingDecision.crop_type === 'erbsen' && (
                          <div>
                            <h5 className="font-medium text-gray-700 mb-2">🟢 Sommer-Erbsen-Behandlungen</h5>
                            <div className="grid grid-cols-1 gap-4">
                              {machines.filter(m => m.crop_specific === 'erbsen').map(machine => (
                                <label key={machine.id} className="flex items-center space-x-3 p-3 border border-green-200 rounded-lg cursor-pointer hover:bg-green-50">
                                  <input
                                    type="checkbox"
                                    checked={farmingDecision.machines[step].includes(machine.id)}
                                    onChange={() => handleMachineSelection(step, machine.id)}
                                    className="text-green-600"
                                  />
                                  <div className="flex-1">
                                    <div className="font-medium">{machine.name}</div>
                                    <div className="text-sm text-gray-500">{machine.specifications}</div>
                                    <div className="text-sm font-semibold text-green-600">{(machine.price_per_use || machine.cost_per_hectare || 0).toFixed(1)}€/ha</div>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <div className="mt-2 p-3 bg-green-50 rounded-lg">
                              <p className="text-sm text-green-700">
                                <strong>💡 Erbsen-Info:</strong> Herbizid relativ teuer, Insektizid gegen Blattläuse und Erbsenwickler wichtig. 
                                Gesamtkosten: ca. 138€/ha.
                              </p>
                            </div>
                          </div>
                        )}
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">🐛 Zusätzliche Insektizidbehandlung (bei Bedarf)</h5>
                          <div className="grid grid-cols-1 gap-4">
                            {machines.filter(m => m.treatment_type === 'insektizid').map(machine => (
                              <label key={`spring-${machine.id}`} className="flex items-center space-x-3 p-3 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-50">
                                <input
                                  type="checkbox"
                                  checked={farmingDecision.machines[step].includes(machine.id)}
                                  onChange={() => handleMachineSelection(step, machine.id)}
                                  className="text-blue-600"
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{machine.name}</div>
                                  <div className="text-sm text-gray-500">Gegen verschiedene Schädlinge</div>
                                  <div className="text-sm text-gray-500">{(machine.price_per_use || machine.cost_per_hectare || 0).toFixed(1)}€/ha</div>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              } else if (step === 'duengung') {
                return (
                  <div key={step}>
                    <h4 className="text-lg font-semibold text-gray-700 mb-3">🌿 {getGermanWorkingStep(step)}</h4>
                    
                    {farmingDecision.fertilizer_choice.fertilizer_type ? (
                      <div>
                        {/* Show machines based on fertilizer type */}
                        {Object.entries(fertilizerSpecs).map(([fertType, spec]) => {
                          if (farmingDecision.fertilizer_choice.fertilizer_type === fertType) {
                            const relevantMachines = machines.filter(m => {
                              if (spec.category === 'mineral') {
                                return m.fertilizer_type === 'mineral';
                              } else if (spec.category === 'organic') {
                                // Spezifische Zuordnung für organische Dünger
                                if (fertType === 'rindermist') {
                                  return m.fertilizer_type === 'organic_solid';
                                } else {
                                  // Flüssige organische Dünger (gülle, gärrest)
                                  return m.fertilizer_type === 'organic_liquid';
                                }
                              }
                              return false;
                            });
                            
                            return (
                              <div key={fertType}>
                                <p className="text-sm text-gray-600 mb-3">
                                  Maschinen für {spec.name}:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {relevantMachines.map(machine => (
                                    <label key={machine.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                      <input
                                        type="checkbox"
                                        checked={farmingDecision.machines[step].includes(machine.id)}
                                        onChange={() => handleMachineSelection(step, machine.id)}
                                        className="text-green-600"
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium">{machine.name}</div>
                                        <div className="text-sm text-gray-500">{machine.specifications}</div>
                                        <div className="text-sm text-gray-500">{machine.price_per_use || machine.cost_per_hectare}€/ha</div>
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500">Bitte zuerst einen Dünger auswählen</p>
                    )}
                  </div>
                );
              } else if (step === 'ernte') {
                // Harvest machines - filter by crop type
                const suitableMachines = machines.filter(machine => {
                  return machine.suitable_for && machine.suitable_for.includes(farmingDecision.crop_type);
                });
                
                return (
                  <div key={step}>
                    <h4 className="text-lg font-semibold text-gray-700 mb-3">🌾 {getGermanWorkingStep(step)}</h4>
                    {suitableMachines.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suitableMachines.map(machine => (
                          <label key={machine.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={farmingDecision.machines[step].includes(machine.id)}
                              onChange={() => handleMachineSelection(step, machine.id)}
                              className="text-green-600"
                            />
                            <div className="flex-1">
                              <div className="font-medium">{machine.name}</div>
                              <div className="text-sm text-gray-500">{machine.description}</div>
                              <div className="text-sm text-gray-500">{machine.price_per_use || machine.cost_per_hectare}€/ha</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-700">
                          Keine passenden Erntemaschinen für {getGermanCropType(farmingDecision.crop_type)} verfügbar.
                        </p>
                      </div>
                    )}
                    
                    {/* Special info for Winterroggen */}
                    {farmingDecision.crop_type === 'winterroggen' && suitableMachines.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          <strong>💡 Winterroggen-Info:</strong> Sie können zwischen Körnerernte (Mähdrescher) 
                          oder Ganzpflanzensilage (Häcksler) wählen. Ganzpflanzensilage wird als Futter verwendet.
                        </p>
                      </div>
                    )}
                  </div>
                );
              } else {
                // Andere Arbeitsschritte (unverändert)
                return (
                  <div key={step}>
                    <h4 className="text-lg font-semibold text-gray-700 mb-3">{getGermanWorkingStep(step)}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {machines.map(machine => (
                        <label key={machine.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={farmingDecision.machines[step].includes(machine.id)}
                            onChange={() => handleMachineSelection(step, machine.id)}
                            className="text-green-600"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{machine.name}</div>
                            <div className="text-sm text-gray-500">{machine.price_per_use || machine.cost_per_hectare}€/ha</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>

        {/* Harvest Option */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📦 Erntegut-Option</h3>
          <div className="space-y-4">
            <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="harvest_option"
                value="ship_home"
                checked={farmingDecision.harvest_option === 'ship_home'}
                onChange={(e) => handleFarmingDecisionChange('harvest_option', e.target.value)}
                className="text-green-600"
              />
              <div className="flex-1">
                <div className="font-medium">Erntegut nach Hause versenden</div>
                <div className="text-sm text-gray-500">Versandkosten: 25€</div>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="harvest_option"
                value="sell_to_farmer"
                checked={farmingDecision.harvest_option === 'sell_to_farmer'}
                onChange={(e) => handleFarmingDecisionChange('harvest_option', e.target.value)}
                className="text-green-600"
              />
              <div className="flex-1">
                <div className="font-medium">An Landwirt zu aktuellen Marktpreisen verkaufen</div>
                <div className="text-sm text-gray-500">Keine Versandkosten</div>
              </div>
            </label>
          </div>
          
          {farmingDecision.harvest_option === 'ship_home' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Lieferadresse</label>
              <textarea
                value={farmingDecision.shipping_address}
                onChange={(e) => handleFarmingDecisionChange('shipping_address', e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                rows="3"
                placeholder="Vollständige Lieferadresse eingeben..."
              />
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep('plots')}
            className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Zurück zu Parzellen
          </button>
          <button
            onClick={() => setCurrentStep('review')}
            disabled={!farmingDecision.cultivation_method || !farmingDecision.crop_type}
            className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            Bestellung überprüfen
          </button>
        </div>
      </div>
    </div>
  );

  const renderReviewOrder = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Bestellung überprüfen</h2>
        <p className="text-lg text-gray-600">Ihre Entscheidungen werden auf echter 250m² Parzelle umgesetzt!</p>
      </div>

      <div className="space-y-6">
        {/* User Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Ihre Angaben</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Vollständiger Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
              <input
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="E-Mail-Adresse"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Telefon (optional)</label>
              <input
                type="tel"
                value={userInfo.phone}
                onChange={(e) => setUserInfo(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Telefonnummer"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Bestellübersicht</h3>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Parzelle:</span>
              <span>{selectedPlot?.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Anbaumethode:</span>
              <span>{getGermanCultivationMethod(farmingDecision.cultivation_method)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Kultur:</span>
              <span>{getGermanCropType(farmingDecision.crop_type)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Düngung:</span>
              <span>{fertilizerSpecs[farmingDecision.fertilizer_choice.fertilizer_type]?.name || 'Keine'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Erntegut:</span>
              <span>{farmingDecision.harvest_option === 'ship_home' ? 'Versand nach Hause' : 'Verkauf an Landwirt'}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Erwarteter Ertrag:</span>
              <span>{expectedYields[farmingDecision.crop_type] || 0}kg</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Erwarteter Marktwert:</span>
              <span>{getExpectedMarketValue().toFixed(2)}€</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Gesamtkosten:</span>
              <span className="text-xl font-bold text-green-600">{calculateTotalCost().toFixed(2)}€</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep('farming')}
            className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Zurück zur Planung
          </button>
          <button
            onClick={handleSubmitOrder}
            disabled={loading || !userInfo.name || !userInfo.email}
            className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Wird übermittelt...' : 'Jetzt bestellen und bezahlen'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderPaymentSection = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Zahlung</h2>
        <p className="text-lg text-gray-600">
          Bestellung: {orderToPayFor?.id} - Gesamtbetrag: {orderToPayFor?.total_cost.toFixed(2)}€
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: "EUR" }}>
          <PayPalButtons
            createOrder={async () => {
              try {
                const response = await axios.post(`${API}/payments/create-paypal-order`, {
                  order_id: orderToPayFor.id,
                  amount: orderToPayFor.total_cost
                });
                return response.data.paypal_order_id;
              } catch (error) {
                console.error('Error creating PayPal order:', error);
                throw error;
              }
            }}
            onApprove={async (data) => {
              try {
                await axios.post(`${API}/payments/capture-paypal-order`, {
                  paypal_order_id: data.orderID
                });
                handlePaymentSuccess();
              } catch (error) {
                console.error('Error capturing PayPal order:', error);
                alert('Fehler bei der Zahlung. Bitte versuchen Sie es erneut.');
              }
            }}
            onError={(error) => {
              console.error('PayPal error:', error);
              alert('Zahlung fehlgeschlagen. Bitte versuchen Sie es erneut.');
            }}
          />
        </PayPalScriptProvider>
      </div>
    </div>
  );

  const renderActiveOrders = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Aktive Parzellen</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {orders.map(order => (
          <div key={order.id} className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-gray-800">{order.user_name}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                order.status === 'implementing' ? 'bg-blue-100 text-blue-800' :
                order.status === 'growing' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {getGermanStatus(order.status)}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div><strong>Kultur:</strong> {getGermanCropType(order.farming_decision.crop_type)}</div>
              <div><strong>Methode:</strong> {getGermanCultivationMethod(order.farming_decision.cultivation_method)}</div>
              <div><strong>Ertrag erwartet:</strong> {order.expected_yield_kg}kg</div>
              <div><strong>Marktwert:</strong> {order.expected_market_value.toFixed(2)}€</div>
              <div><strong>Kosten:</strong> {order.total_cost.toFixed(2)}€</div>
              <div><strong>Erstellt:</strong> {new Date(order.created_at).toLocaleDateString('de-DE')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {renderHeader()}
      {!showPayment && currentStep !== 'plots' && renderStepIndicator()}
      
      {showPayment && renderPaymentSection()}
      {!showPayment && currentStep === 'plots' && renderPlotSelection()}
      {!showPayment && currentStep === 'farming' && renderFarmingDecisions()}
      {!showPayment && currentStep === 'review' && renderReviewOrder()}
      
      {!showPayment && orders.length > 0 && currentStep === 'plots' && renderActiveOrders()}
    </div>
  );
};

export default App;