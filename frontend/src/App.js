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
      const response = await axios.get(`${API}/expected-yields`);
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
                src="data:image/png;base64,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" 
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
        <p className="text-lg text-gray-600">Alle Parzellen sind 18m × 13,8m = 250m² groß</p>
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
            {['roggen', 'weizen', 'gerste', 'triticale', 'silomais', 'zuckerrueben', 'luzerne', 'gras', 'bluehmischung'].map(crop => (
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