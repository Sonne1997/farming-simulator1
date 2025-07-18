import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [currentStep, setCurrentStep] = useState('plots');
  const [plots, setPlots] = useState([]);
  const [machines, setMachines] = useState([]);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [farmingDecision, setFarmingDecision] = useState({
    cultivation_method: '',
    crop_type: '',
    cultivation_machines: [],
    protection_machines: [],
    care_machines: []
  });
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: ''
  });
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initializeData();
    fetchPlots();
    fetchMachines();
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
    
    const plotCost = selectedPlot.size_acres * selectedPlot.price_per_acre;
    
    const allMachineIds = [
      ...farmingDecision.cultivation_machines,
      ...farmingDecision.protection_machines,
      ...farmingDecision.care_machines
    ];
    
    const machineCost = allMachineIds.reduce((total, machineId) => {
      const machine = machines.find(m => m.id === machineId);
      return total + (machine ? machine.price_per_use : 0);
    }, 0);
    
    return plotCost + machineCost;
  };

  const handleSubmitOrder = async () => {
    if (!selectedPlot || !userInfo.name || !userInfo.email) {
      alert('Bitte füllen Sie alle erforderlichen Informationen aus');
      return;
    }
    
    setLoading(true);
    try {
      const orderData = {
        user_name: userInfo.name,
        user_email: userInfo.email,
        plot_id: selectedPlot.id,
        farming_decision: farmingDecision,
        notes: `Virtuelle Landwirtschaft auf ${selectedPlot.name}`
      };
      
      await axios.post(`${API}/orders`, orderData);
      alert('Bestellung erfolgreich abgeschickt! Der Landwirt wird Ihre Entscheidungen umsetzen.');
      
      // Reset form
      setCurrentStep('plots');
      setSelectedPlot(null);
      setFarmingDecision({
        cultivation_method: '',
        crop_type: '',
        cultivation_machines: [],
        protection_machines: [],
        care_machines: []
      });
      setUserInfo({ name: '', email: '' });
      
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
      'clay': 'Lehmboden',
      'sandy': 'Sandboden',
      'loamy': 'Lößboden',
      'silt': 'Schluffboden'
    };
    return translations[soilType] || soilType;
  };

  const getGermanCropType = (cropType) => {
    const translations = {
      'wheat': 'Weizen',
      'corn': 'Mais',
      'soybeans': 'Sojabohnen',
      'potatoes': 'Kartoffeln',
      'carrots': 'Karotten',
      'lettuce': 'Kopfsalat',
      'tomatoes': 'Tomaten',
      'onions': 'Zwiebeln'
    };
    return translations[cropType] || cropType;
  };

  const getGermanCultivationMethod = (method) => {
    const translations = {
      'conventional': 'Konventionell',
      'no_till': 'Direktsaat',
      'organic': 'Biologisch',
      'precision': 'Präzisionsanbau'
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
            <div className="bg-white rounded-lg p-3">
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGNUY1RjUiLz48ZWxsaXBzZSBjeD0iMTMwIiBjeT0iNzAiIHJ4PSIyNSIgcnk9IjIwIiBmaWxsPSIjQTVBNUE1Ii8+PGVsbGlwc2UgY3g9IjE0NSIgY3k9IjcwIiByeD0iMTIiIHJ5PSIxMCIgZmlsbD0iI0E1QTVBNSIvPjxwYXRoIGQ9Ik0xMDUgODBDMTA1IDgwIDEyMCA3MCAzNSA3MEM1MCA3MCA2NSA4MCA2NSA4MEM2NSA4MCA3MCA5MCA3MCA5NUMxNzAgOTUgMTM1IDEwNSAxMzUgMTA1SDE1QzExMCAxMDUgMTA1IDEwMCAxMDUgOTVWODBaIiBmaWxsPSIjQTVBNUE1Ii8+PGNpcmNsZSBjeD0iMTIwIiBjeT0iODUiIHI9IjMiIGZpbGw9IiNGRkZGRkYiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSI4NSIgcj0iMyIgZmlsbD0iI0ZGRkZGRiIvPjxwYXRoIGQ9Ik0xMjAgMTAwQzEyMCAxMDAgMTMwIDEwNSAxNDAgMTAwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PGNpcmNsZSBjeD0iNzAiIGN5PSIxMzAiIHI9IjE1IiBmaWxsPSIjMjJDNTVFIi8+PGNpcmNsZSBjeD0iMTI1IiBjeT0iMTMwIiByPSIyMCIgZmlsbD0iIzIyQzU1RSIvPjxjaXJjbGUgY3g9IjcwIiBjeT0iMTMwIiByPSI2IiBmaWxsPSIjMDAwMDAwIi8+PGNpcmNsZSBjeD0iMTI1IiBjeT0iMTMwIiByPSI4IiBmaWxsPSIjMDAwMDAwIi8+PHJlY3QgeD0iNjAiIHk9IjEwNSIgd2lkdGg9IjgwIiBoZWlnaHQ9IjIwIiByeD0iNSIgZmlsbD0iIzIyQzU1RSIvPjxwYXRoIGQ9Ik0zMCAxNTBDMzAgMTUwIDQwIDEzNSA2MCA0MEM2MCA0MCA2NSAxMzUgNzAgMTM1Qzc1IDEzNSA4NSAxNDAgODUgMTQwQzg1IDE0MCA4NSAxNDUgODUgMTQ1TDQwIDE2MFoiIGZpbGw9IiNGRkE1MDAiLz48cGF0aCBkPSJNMzAgMTUwVjE2NUgxMDBWMTUwSDMwWiIgZmlsbD0iI0ZGREIwMCIvPjxwYXRoIGQ9Ik0zMCAxNjVWMTgwSDEwMFYxNjVIMzBaIiBmaWxsPSIjRkZEQjAwIi8+PHBhdGggZD0iTTMwIDE4MFYxOTVIMTAwVjE4MEgzMFoiIGZpbGw9IiNGRkRCMDAiLz48ZWxsaXBzZSBjeD0iNDIiIGN5PSIxNDAiIHJ4PSI0IiByeT0iOCIgZmlsbD0iIzIyQzU1RSIvPjxlbGxpcHNlIGN4PSI1MCIgY3k9IjE0MCIgcng9IjMiIHJ5PSI4IiBmaWxsPSIjMjJDNTVFIi8+PGVsbGlwc2UgY3g9IjU4IiBjeT0iMTQwIiByeD0iMyIgcnk9IjgiIGZpbGw9IiMyMkM1NUUiLz48ZWxsaXBzZSBjeD0iNjYiIGN5PSIxNDAiIHJ4PSI0IiByeT0iOCIgZmlsbD0iIzIyQzU1RSIvPjx0ZXh0IHg9IjEwMCIgeT0iMjEwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMDAzMzMzIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TFVTVCBBVUY8L3RleHQ+PHRleHQgeD0iMTAwIiB5PSIyMjUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMwMDMzMzMiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5MQU5EV0lSVFNDSEFGVDwvdGV4dD48L3N2Zz4="
                alt="Lust auf Landwirtschaft" 
                className="w-16 h-16 object-contain"
              />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Lust auf Landwirtschaft</h1>
              <p className="text-xl text-green-100">Parzellen pachten, Landwirtschaft planen, echte Ernte erhalten!</p>
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{orders.length}</div>
            <div className="text-green-100">Aktive Höfe</div>
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
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Wählen Sie Ihre Parzelle</h2>
        <p className="text-lg text-gray-600">Wählen Sie eine echte Parzelle aus, auf der Ihre landwirtschaftlichen Entscheidungen umgesetzt werden</p>
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
                  <span className="font-medium">{plot.size_acres} Hektar</span>
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
                  <span className="text-gray-500">Preis:</span>
                  <span className="font-bold text-green-600">{plot.price_per_acre}€/Hektar</span>
                </div>
              </div>
              <button
                onClick={() => handlePlotSelection(plot)}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Diese Parzelle auswählen
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
        <p className="text-lg text-gray-600">Treffen Sie Entscheidungen, die auf Ihrer ausgewählten Parzelle umgesetzt werden: <strong>{selectedPlot?.name}</strong></p>
      </div>

      <div className="space-y-8">
        {/* Cultivation Method */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🚜 Anbaumethode</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['conventional', 'no_till', 'organic', 'precision'].map(method => (
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
          <h3 className="text-xl font-bold text-gray-800 mb-4">🌾 Fruchtauswahl</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['wheat', 'corn', 'soybeans', 'potatoes', 'carrots', 'lettuce', 'tomatoes', 'onions'].map(crop => (
              <label key={crop} className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="crop_type"
                  value={crop}
                  checked={farmingDecision.crop_type === crop}
                  onChange={(e) => handleFarmingDecisionChange('crop_type', e.target.value)}
                  className="text-green-600"
                />
                <span className="font-medium">{getGermanCropType(crop)}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Machine Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🚜 Maschinenauswahl</h3>
          
          <div className="space-y-6">
            {/* Cultivation Machines */}
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Bodenbearbeitungsmaschinen</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getMachinesByType('tractor').concat(getMachinesByType('cultivator'), getMachinesByType('plow')).map(machine => (
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

            {/* Protection Machines */}
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Pflanzenschutzmaschinen</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getMachinesByType('sprayer').map(machine => (
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

            {/* Care Machines */}
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Pflege- und Erntemaschinen</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {getMachinesByType('seeder').concat(getMachinesByType('harvester')).map(machine => (
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
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Überprüfen Sie Ihre Bestellung</h2>
        <p className="text-lg text-gray-600">Ihre landwirtschaftlichen Entscheidungen werden auf echtem Land umgesetzt!</p>
      </div>

      <div className="space-y-6">
        {/* User Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Ihre Angaben</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vollständiger Name</label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Ihren Namen eingeben"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail-Adresse</label>
              <input
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Ihre E-Mail eingeben"
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
              <span>{selectedPlot?.name} ({selectedPlot?.size_acres} Hektar)</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Anbaumethode:</span>
              <span>{getGermanCultivationMethod(farmingDecision.cultivation_method)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Fruchtart:</span>
              <span>{getGermanCropType(farmingDecision.crop_type)}</span>
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
            {loading ? 'Wird übermittelt...' : 'Bestellung abschicken'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveOrders = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Aktive Höfe</h2>
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
              <div><strong>Frucht:</strong> {getGermanCropType(order.farming_decision.crop_type)}</div>
              <div><strong>Methode:</strong> {getGermanCultivationMethod(order.farming_decision.cultivation_method)}</div>
              <div><strong>Gesamtkosten:</strong> {order.total_cost.toFixed(2)}€</div>
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