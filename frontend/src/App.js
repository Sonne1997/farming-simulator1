import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [currentStep, setCurrentStep] = useState('plots');
  const [plots, setPlots] = useState([]);
  const [machines, setMachines] = useState([]);
  const [marketPrices, setMarketPrices] = useState({});
  const [expectedYields, setExpectedYields] = useState({});
  const [marketValues, setMarketValues] = useState({});
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [farmingDecision, setFarmingDecision] = useState({
    cultivation_method: '',
    crop_type: '',
    cultivation_machines: [],
    protection_machines: [],
    care_machines: [],
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

  useEffect(() => {
    initializeData();
    fetchPlots();
    fetchMachines();
    fetchMarketPrices();
    fetchExpectedYields();
    fetchOrders();
  }, []);

  const initializeData = async () => {
    try {
      await axios.post(`${API}/initialize-data`);
    } catch (error) {
      console.error('Error initializing data:', error);
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

  const fetchMachines = async () => {
    try {
      const response = await axios.get(`${API}/machines`);
      setMachines(response.data);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const fetchMarketPrices = async () => {
    try {
      const response = await axios.get(`${API}/market-prices`);
      setMarketPrices(response.data);
    } catch (error) {
      console.error('Error fetching market prices:', error);
    }
  };

  const fetchExpectedYields = async () => {
    try {
      const response = await axios.get(`${API}/expected-yields/${selectedPlot?.soil_points || 35}`);
      setExpectedYields(response.data);
    } catch (error) {
      console.error('Error fetching expected yields:', error);
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

  const handleMachineSelection = (machineType, machineId) => {
    setFarmingDecision(prev => ({
      ...prev,
      [machineType]: prev[machineType].includes(machineId)
        ? prev[machineType].filter(id => id !== machineId)
        : [...prev[machineType], machineId]
    }));
  };

  const calculateTotalCost = () => {
    if (!selectedPlot) return 0;
    
    const plotCost = selectedPlot.price_per_plot;
    
    const allMachineIds = [
      ...farmingDecision.cultivation_machines,
      ...farmingDecision.protection_machines,
      ...farmingDecision.care_machines
    ];
    
    const machineCost = allMachineIds.reduce((total, machineId) => {
      const machine = machines.find(m => m.id === machineId);
      return total + (machine ? machine.price_per_use : 0);
    }, 0);
    
    const shippingCost = farmingDecision.harvest_option === 'ship_home' ? 25.0 : 0;
    
    return plotCost + machineCost + shippingCost;
  };

  const getExpectedMarketValue = () => {
    if (!farmingDecision.crop_type) return 0;
    
    const yield_kg = expectedYields[farmingDecision.crop_type] || 0;
    const price_per_ton = marketPrices[farmingDecision.crop_type] || 0;
    
    return (yield_kg / 1000) * price_per_ton;
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
        farming_decision: farmingDecision,
        notes: `Lust auf Landwirtschaft - ${selectedPlot.name}`
      };
      
      await axios.post(`${API}/orders`, orderData);
      alert('Bestellung erfolgreich abgeschickt! Sie erhalten Updates zum Fortschritt Ihrer Parzelle.');
      
      // Reset form
      setCurrentStep('plots');
      setSelectedPlot(null);
      setFarmingDecision({
        cultivation_method: '',
        crop_type: '',
        cultivation_machines: [],
        protection_machines: [],
        care_machines: [],
        harvest_option: 'ship_home',
        shipping_address: ''
      });
      setUserInfo({ name: '', email: '', phone: '' });
      
      // Refresh data
      fetchPlots();
      fetchOrders();
    } catch (error) {
      console.error('Error submitting order:', error);
      alert('Fehler beim Absenden der Bestellung. Bitte versuchen Sie es erneut.');
    } finally {
      setLoading(false);
    }
  };

  const getMachinesByType = (type) => {
    return machines.filter(machine => machine.type === type);
  };

  const getGermanSoilType = (soilType) => {
    const translations = {
      'sand': 'Sandboden',
      'loamy_sand': 'Lehmiger Sandboden',
      'clayey_sand': 'Anlehmiger Sandboden'
    };
    return translations[soilType] || soilType;
  };

  const getGermanCropType = (cropType) => {
    const translations = {
      'roggen': 'Roggen',
      'weizen': 'Weizen',
      'gerste': 'Gerste',
      'triticale': 'Triticale',
      'silomais': 'Silomais',
      'zuckerrueben': 'Zuckerrüben',
      'luzerne': 'Luzerne',
      'gras': 'Gras',
      'bluehmischung': 'Blühmischung',
      'erbsen': 'Erbsen'
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

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-green-800 to-green-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-6 mb-6 md:mb-0">
            <div className="bg-white rounded-lg p-2">
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGNUY1RjUiLz4KICA8IS0tIEt1aCAtLT4KICA8cGF0aCBkPSJNMTA1IDQ1QzEwNSA0NSAxMjAgMzUgMTQwIDM1QzE2MCAzNSAxNzUgNDUgMTc1IDQ1QzE3NSA0NSAxODAgNTUgMTgwIDg1QzE4MCA4NSAxNjAgODUgMTQwIDg1QzEyMCA4NSAxMDAgODUgMTAwIDg1QzEwMCA1NSAxMDUgNDUgMTA1IDQ1WiIgZmlsbD0iI0E1QTVBNSIvPgogIDwhLS0gS3VoLUtvcGYgLS0+CiAgPGVsbGlwc2UgY3g9IjEyNSIgY3k9IjM4IiByeD0iMTIiIHJ5PSI4IiBmaWxsPSIjQTVBNUE1Ii8+CiAgPGVsbGlwc2UgY3g9IjE0NSIgY3k9IjM4IiByeD0iMTAiIHJ5PSI2IiBmaWxsPSIjQTVBNUE1Ii8+CiAgPCEtLSBLdWgtQXVnZW4gLS0+CiAgPGNpcmNsZSBjeD0iMTIwIiBjeT0iNDgiIHI9IjIiIGZpbGw9IiNGRkZGRkYiLz4KICA8Y2lyY2xlIGN4PSIxNTAiIGN5PSI0OCIgcj0iMiIgZmlsbD0iI0ZGRkZGRiIvPgogIDxwYXRoIGQ9Ik0xMjAgNTVDMTIwIDU1IDEzMCA2MCAxNDAgNTUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDwhLS0gUGZsYW56ZSAtLT4KICA8ZWxsaXBzZSBjeD0iNDUiIGN5PSI1MCIgcng9IjQiIHJ5PSI4IiBmaWxsPSIjMjJDNTVFIi8+CiAgPGVsbGlwc2UgY3g9IjUyIiBjeT0iNDgiIHJ4PSIzIiByeT0iNyIgZmlsbD0iIzIyQzU1RSIvPgogIDxlbGxpcHNlIGN4PSI1OSIgY3k9IjUwIiByeD0iMyIgcnk9IjciIGZpbGw9IiMyMkM1NUUiLz4KICA8IS0tIFRyYWt0b3IgLS0+CiAgPHJlY3QgeD0iMTEwIiB5PSI2NSIgd2lkdGg9IjU1IiBoZWlnaHQ9IjI1IiByeD0iNSIgZmlsbD0iIzIyQzU1RSIvPgogIDxyZWN0IHg9IjEyMCIgeT0iNTUiIHdpZHRoPSIzNSIgaGVpZ2h0PSIxNSIgcng9IjMiIGZpbGw9IiMyMkM1NUUiLz4KICA8IS0tIFRyYWt0b3ItUmFkZXIgLS0+CiAgPGNpcmNsZSBjeD0iMTIwIiBjeT0iOTUiIHI9IjEyIiBmaWxsPSIjMjJDNTVFIi8+CiAgPGNpcmNsZSBjeD0iMTIwIiBjeT0iOTUiIHI9IjQiIGZpbGw9IiMwMDAwMDAiLz4KICA8Y2lyY2xlIGN4PSIxNTUiIGN5PSI5NSIgcj0iMTUiIGZpbGw9IiMyMkM1NUUiLz4KICA8Y2lyY2xlIGN4PSIxNTUiIGN5PSI5NSIgcj0iNiIgZmlsbD0iIzAwMDAwMCIvPgogIDwhLS0gRmVsZCAtLT4KICA8cGF0aCBkPSJNMjAgMTIwVjE0MEgxMDBWMTIwSDIwWiIgZmlsbD0iI0ZGREY4QiIvPgogIDxwYXRoIGQ9Ik0yMCAxNDBWMTYwSDEwMFYxNDBIMjBaIiBmaWxsPSIjRkZEQjAwIi8+CiAgPHBhdGggZD0iTTIwIDE2MFYxODBIMTAwVjE2MEgyMFoiIGZpbGw9IiNGRkE1MDAiLz4KICA8IS0tIFRleHQgLS0+CiAgPHRleHQgeD0iMTAwIiB5PSIxOTQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMwMDMzMzMiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkxVU1QgQVVGPC90ZXh0PgogIDx0ZXh0IHg9IjEwMCIgeT0iMjEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTAiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMDAzMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5MQU5EV0lSVFNDSEFGVDwvdGV4dD4KPC9zdmc+" 
                alt="Lust auf Landwirtschaft" 
                className="w-20 h-20 object-contain"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Lust auf Landwirtschaft</h1>
              <p className="text-xl text-green-100">250m² Parzellen pachten • Echte Landwirtschaft erleben</p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{orders.length}</div>
            <div className="text-green-100">Aktive Parzellen</div>
          </div>
        </div>
      </div>
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
            {['roggen', 'weizen', 'gerste', 'triticale', 'silomais', 'zuckerrueben', 'luzerne', 'gras', 'bluehmischung', 'erbsen'].map(crop => (
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
                  {marketPrices[crop] && (
                    <div className="text-sm text-gray-500">{marketPrices[crop]}€/t</div>
                  )}
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
                <span className="font-bold ml-2">{expectedYields[farmingDecision.crop_type]}kg</span>
              </div>
              <div>
                <span className="text-blue-600">Marktwert:</span>
                <span className="font-bold ml-2">{getExpectedMarketValue().toFixed(2)}€</span>
              </div>
            </div>
          </div>
        )}

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
                <div className="font-medium">An Landwirt zu Weltmarktpreisen verkaufen</div>
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

        {/* Machine Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🚜 Maschinenauswahl</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Bodenbearbeitung</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getMachinesByType('traktor').concat(getMachinesByType('grubber'), getMachinesByType('pflug')).map(machine => (
                  <label key={machine.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={farmingDecision.cultivation_machines.includes(machine.id)}
                      onChange={() => handleMachineSelection('cultivation_machines', machine.id)}
                      className="text-green-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{machine.name}</div>
                      <div className="text-sm text-gray-500">{machine.price_per_use}€</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Pflanzenschutz</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getMachinesByType('feldspritze').map(machine => (
                  <label key={machine.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={farmingDecision.protection_machines.includes(machine.id)}
                      onChange={() => handleMachineSelection('protection_machines', machine.id)}
                      className="text-green-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{machine.name}</div>
                      <div className="text-sm text-gray-500">{machine.price_per_use}€</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Aussaat & Ernte</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getMachinesByType('saemaschine').concat(getMachinesByType('maehdrescher')).map(machine => (
                  <label key={machine.id} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={farmingDecision.care_machines.includes(machine.id)}
                      onChange={() => handleMachineSelection('care_machines', machine.id)}
                      className="text-green-600"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{machine.name}</div>
                      <div className="text-sm text-gray-500">{machine.price_per_use}€</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
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

        {/* Advisory Info */}
        <div className="bg-yellow-50 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-2">📧 Beratungsservice inklusive</h3>
          <p className="text-yellow-700">
            Sie erhalten regelmäßige Updates und Empfehlungen zu Ihrer Parzelle, 
            einschließlich Hinweise zu Krankheitsdruck und Behandlungsempfehlungen.
          </p>
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
            {loading ? 'Wird übermittelt...' : 'Parzelle pachten'}
          </button>
        </div>
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
      {currentStep !== 'plots' && renderStepIndicator()}
      
      {currentStep === 'plots' && renderPlotSelection()}
      {currentStep === 'farming' && renderFarmingDecisions()}
      {currentStep === 'review' && renderReviewOrder()}
      
      {orders.length > 0 && currentStep === 'plots' && renderActiveOrders()}
    </div>
  );
};

export default App;