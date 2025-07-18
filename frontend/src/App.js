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
      alert('Please fill in all required information');
      return;
    }
    
    setLoading(true);
    try {
      const orderData = {
        user_name: userInfo.name,
        user_email: userInfo.email,
        plot_id: selectedPlot.id,
        farming_decision: farmingDecision,
        notes: `Virtual farming experience on ${selectedPlot.name}`
      };
      
      await axios.post(`${API}/orders`, orderData);
      alert('Order submitted successfully! The farmer will implement your decisions.');
      
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
      alert('Error submitting order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getMachinesByType = (type) => {
    return machines.filter(machine => machine.type === type);
  };

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-green-800 to-green-600 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-6 mb-6 md:mb-0">
            <div className="bg-white rounded-lg p-3">
              <img 
                src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0xMDcuNSA4NS41QzEwNy41IDg1LjUgMTIwIDc1IDEzNSA3NUMxNTAgNzUgMTYyLjUgODUuNSAxNjIuNSA4NS41QzE2Mi41IDg1LjUgMTcwIDk1IDE3MCAzMDBDMTcwIDMwMCAxNDAgMzAwIDEzNSAzMDBDMTMwIDMwMCAxMDAgMzAwIDEwMCAzMDBDMTAwIDk1IDEwNy41IDg1LjUgMTA3LjUgODUuNVoiIGZpbGw9IiNBNUE1QTUiLz4KPGVsbGlwc2UgY3g9IjEyNCIgY3k9IjcwIiByeD0iMTUiIHJ5PSIxMiIgZmlsbD0iI0E1QTVBNSIvPgo8ZWxsaXBzZSBjeD0iMTQ2IiBjeT0iNzAiIHJ4PSIxNSIgcnk9IjEyIiBmaWxsPSIjQTVBNUE1Ii8+CjxwYXRoIGQ9Ik0xMDUgODBIMTY1VjEwNUMxNjUgMTEwIDE2MCAxMTUgMTU1IDExNUgxMTVDMTEwIDExNSAxMDUgMTEwIDEwNSAxMDVWODBaIiBmaWxsPSIjQTVBNUE1Ii8+CjxjaXJjbGUgY3g9IjEyMCIgY3k9Ijg1IiByPSIzIiBmaWxsPSIjRkZGRkZGIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9Ijg1IiByPSIzIiBmaWxsPSIjRkZGRkZGIi8+CjxwYXRoIGQ9Ik0xMjAgMTAwQzEyMCAxMDAgMTMwIDEwNSAxNDAgMTAwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMTMwQzEzMCAxMzAgMTIwIDEzNSAxNDAgMTM1QzE2MCAxMzUgMTYwIDEzMCAxNjAgMTMwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMTQ1QzEzMCAxNDUgMTIwIDE1MiAxNDAgMTUyQzE2MCAxNTIgMTYwIDE0NSAxNjAgMTQ1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMTYwQzEzMCAxNjAgMTIwIDE2NSAxNDAgMTY1QzE2MCAxNjUgMTYwIDE2MCAxNjAgMTYwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMTc1QzEzMCAxNzUgMTIwIDE4MiAxNDAgMTgyQzE2MCAxODIgMTYwIDE3NSAxNjAgMTc1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMTkwQzEzMCAxOTAgMTIwIDE5NSAxNDAgMTk1QzE2MCAxOTUgMTYwIDE5MCAxNjAgMTkwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMjA1QzEzMCAxOTAgMTIwIDIwNSAxNDAgMjA1QzE2MCAyMDUgMTYwIDE5MCAxNjAgMjA1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMjIwQzEzMCAyMjAgMTIwIDIyNSAxNDAgMjI1QzE2MCAyMjUgMTYwIDIyMCAxNjAgMjIwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMjM1QzEzMCAyMzUgMTIwIDI0MCAxNDAgMjQwQzE2MCAyNDAgMTYwIDIzNSAxNjAgMjM1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMjUwQzEzMCAyNTAgMTIwIDI1NSAxNDAgMjU1QzE2MCAyNTUgMTYwIDI1MCAxNjAgMjUwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMjY1QzEzMCAyNjUgMTIwIDI3MCAxNDAgMjcwQzE2MCAyNzAgMTYwIDI2NSAxNjAgMjY1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMjgwQzEzMCAyODAgMTIwIDI4NSAxNDAgMjg1QzE2MCAyODUgMTYwIDI4MCAxNjAgMjgwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMjk1QzEzMCAyOTUgMTIwIDMwMCAxNDAgMzAwQzE2MCAzMDAgMTYwIDI5NSAxNjAgMjk1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMzEwQzEzMCAzMTAgMTIwIDMxNSAxNDAgMzE1QzE2MCAzMTUgMTYwIDMxMCAxNjAgMzEwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMzI1QzEzMCAzMjUgMTIwIDMzMCAxNDAgMzMwQzE2MCAzMzAgMTYwIDMyNSAxNjAgMzI1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMzQwQzEzMCAzNDAgMTIwIDM0NSAxNDAgMzQ1QzE2MCAzNDUgMTYwIDM0MCAxNjAgMzQwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMzU1QzEzMCAzNTUgMTIwIDM2MCAxNDAgMzYwQzE2MCAzNjAgMTYwIDM1NSAxNjAgMzU1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMzcwQzEzMCAzNzAgMTIwIDM3NSAxNDAgMzc1QzE2MCAzNzUgMTYwIDM3MCAxNjAgMzcwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMzg1QzEzMCAzODUgMTIwIDM5MCAxNDAgMzkwQzE2MCAzOTAgMTYwIDM4NSAxNjAgMzg1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNDAwQzEzMCA0MDAgMTIwIDQwNSAxNDAgNDA1QzE2MCA0MDUgMTYwIDQwMCAxNjAgNDAwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNDE1QzEzMCA0MTUgMTIwIDQyMCAxNDAgNDIwQzE2MCA0MjAgMTYwIDQxNSAxNjAgNDE1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNDMwQzEzMCA0MzAgMTIwIDQzNSAxNDAgNDM1QzE2MCA0MzUgMTYwIDQzMCAxNjAgNDMwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNDQ1QzEzMCA0NDUgMTIwIDQ1MCAxNDAgNDUwQzE2MCA0NTAgMTYwIDQ0NSAxNjAgNDQ1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNDYwQzEzMCA0NjAgMTIwIDQ2NSAxNDAgNDY1QzE2MCA0NjUgMTYwIDQ2MCAxNjAgNDYwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNDc1QzEzMCA0NzUgMTIwIDQ4MCAxNDAgNDgwQzE2MCA0ODAgMTYwIDQ3NSAxNjAgNDc1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNDkwQzEzMCA0OTAgMTIwIDQ5NSAxNDAgNDk1QzE2MCA0OTUgMTYwIDQ5MCAxNjAgNDkwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNTA1QzEzMCA1MDUgMTIwIDUxMCAxNDAgNTEwQzE2MCA1MTAgMTYwIDUwNSAxNjAgNTA1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNTIwQzEzMCA1MjAgMTIwIDUyNSAxNDAgNTI1QzE2MCA1MjUgMTYwIDUyMCAxNjAgNTIwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNTM1QzEzMCA1MzUgMTIwIDU0MCAxNDAgNTQwQzE2MCA1NDAgMTYwIDUzNSAxNjAgNTM1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNTUwQzEzMCA1NTAgMTIwIDU1NSAxNDAgNTU1QzE2MCA1NTUgMTYwIDU1MCAxNjAgNTUwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNTY1QzEzMCA1NjUgMTIwIDU3MCAxNDAgNTcwQzE2MCA1NzAgMTYwIDU2NSAxNjAgNTY1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNTgwQzEzMCA1ODAgMTIwIDU4NSAxNDAgNTg1QzE2MCA1ODUgMTYwIDU4MCAxNjAgNTgwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNTk1QzEzMCA1OTUgMTIwIDYwMCAxNDAgNjAwQzE2MCA2MDAgMTYwIDU5NSAxNjAgNTk1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNjEwQzEzMCA2MTAgMTIwIDYxNSAxNDAgNjE1QzE2MCA2MTUgMTYwIDYxMCAxNjAgNjEwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNjI1QzEzMCA2MjUgMTIwIDYzMCAxNDAgNjMwQzE2MCA2MzAgMTYwIDYyNSAxNjAgNjI1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNjQwQzEzMCA2NDAgMTIwIDY0NSAxNDAgNjQ1QzE2MCA2NDUgMTYwIDY0MCAxNjAgNjQwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNjU1QzEzMCA2NTUgMTIwIDY2MCAxNDAgNjYwQzE2MCA2NjAgMTYwIDY1NSAxNjAgNjU1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNjcwQzEzMCA2NzAgMTIwIDY3NSAxNDAgNjc1QzE2MCA2NzUgMTYwIDY3MCAxNjAgNjcwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNjg1QzEzMCA2ODUgMTIwIDY5MCAxNDAgNjkwQzE2MCA2OTAgMTYwIDY4NSAxNjAgNjg1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNzAwQzEzMCA3MDAgMTIwIDcwNSAxNDAgNzA1QzE2MCA3MDUgMTYwIDcwMCAxNjAgNzAwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNzE1QzEzMCA3MTUgMTIwIDcyMCAxNDAgNzIwQzE2MCA3MjAgMTYwIDcxNSAxNjAgNzE1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNzMwQzEzMCA3MzAgMTIwIDczNSAxNDAgNzM1QzE2MCA3MzUgMTYwIDczMCAxNjAgNzMwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNzQ1QzEzMCA3NDUgMTIwIDc1MCAxNDAgNzUwQzE2MCA3NTAgMTYwIDc0NSAxNjAgNzQ1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNzYwQzEzMCA3NjAgMTIwIDc2NSAxNDAgNzY1QzE2MCA3NjUgMTYwIDc2MCAxNjAgNzYwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNzc1QzEzMCA3NzUgMTIwIDc4MCAxNDAgNzgwQzE2MCA3ODAgMTYwIDc3NSAxNjAgNzc1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgNzkwQzEzMCA3OTAgMTIwIDc5NSAxNDAgNzk1QzE2MCA3OTUgMTYwIDc5MCAxNjAgNzkwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgODA1QzEzMCA4MDUgMTIwIDgxMCAxNDAgODEwQzE2MCA4MTAgMTYwIDgwNSAxNjAgODA1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgODIwQzEzMCA4MjAgMTIwIDgyNSAxNDAgODI1QzE2MCA4MjUgMTYwIDgyMCAxNjAgODIwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgODM1QzEzMCA4MzUgMTIwIDg0MCAxNDAgODQwQzE2MCA4NDAgMTYwIDgzNSAxNjAgODM1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgODUwQzEzMCA4NTAgMTIwIDg1NSAxNDAgODU1QzE2MCA4NTUgMTYwIDg1MCAxNjAgODUwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgODY1QzEzMCA4NjUgMTIwIDg3MCAxNDAgODcwQzE2MCA4NzAgMTYwIDg2NSAxNjAgODY1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgODgwQzEzMCA4ODAgMTIwIDg4NSAxNDAgODg1QzE2MCA4ODUgMTYwIDg4MCAxNjAgODgwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgODk1QzEzMCA4OTUgMTIwIDkwMCAxNDAgOTAwQzE2MCA5MDAgMTYwIDg5NSAxNjAgODk1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgOTEwQzEzMCA5MTAgMTIwIDkxNSAxNDAgOTE1QzE2MCA5MTUgMTYwIDkxMCAxNjAgOTEwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgOTI1QzEzMCA5MjUgMTIwIDkzMCAxNDAgOTMwQzE2MCA5MzAgMTYwIDkyNSAxNjAgOTI1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgOTQwQzEzMCA5NDAgMTIwIDk0NSAxNDAgOTQ1QzE2MCA5NDUgMTYwIDk0MCAxNjAgOTQwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgOTU1QzEzMCA5NTUgMTIwIDk2MCAxNDAgOTYwQzE2MCA5NjAgMTYwIDk1NSAxNjAgOTU1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgOTcwQzEzMCA5NzAgMTIwIDk3NSAxNDAgOTc1QzE2MCA5NzUgMTYwIDk3MCAxNjAgOTcwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgOTg1QzEzMCA5ODUgMTIwIDk5MCAxNDAgOTkwQzE2MCA5OTAgMTYwIDk4NSAxNjAgOTg1IiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik0xMzAgMTAwMEM5OTAgODg1IDE0MCAzODMgOTkwIDk5MCAxNDAgOTkwIiBzdHJva2U9IiNGRkZGRkYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CjxwYXRoIGQ9Ik02MCA5MEM2MCA5MCA3NSA3NyA5MCA3N0MxMDUgNzcgMTIwIDkwIDEyMCA5MEMxMjAgOTAgMTMwIDEwMCAxMzAgMTIwQzEzMCAxMjAgMTAwIDEyMCA5NSAxMjBDOTAgMTIwIDYwIDEyMCA2MCAxMjBDNjAgMTAwIDYwIDkwIDYwIDkwWiIgZmlsbD0iIzIyQzU1RSIvPgo8cmVjdCB4PSI5NSIgeT0iMTIwIiB3aWR0aD0iMzUiIGhlaWdodD0iMjUiIHJ4PSI1IiBmaWxsPSIjMjJDNTVFIi8+CjxyZWN0IHg9IjY1IiB5PSIxMDAiIHdpZHRoPSI2NSIgaGVpZ2h0PSIyMCIgcng9IjUiIGZpbGw9IiMyMkM1NUUiLz4KPGNpcmNsZSBjeD0iNzAiIGN5PSIxMzAiIHI9IjEwIiBmaWxsPSIjMTU0MDNDIi8+CjxjaXJjbGUgY3g9IjcwIiBjeT0iMTMwIiByPSI0IiBmaWxsPSIjMDAwMDAwIi8+CjxjaXJjbGUgY3g9IjEyNSIgY3k9IjEzMCIgcj0iMTIiIGZpbGw9IiMxNTQwM0MiLz4KPGNpcmNsZSBjeD0iMTI1IiBjeT0iMTMwIiByPSI1IiBmaWxsPSIjMDAwMDAwIi8+CjxwYXRoIGQ9Ik0zMCA5MEM0MCA5MCA0NSA4NSA2MCA3M0M2MCA3MyA2NCA3MCA3MCA3MEM3NiA3MCA4NiA3MyA4NiA3M0M4NiA3MyA4NiA3NSA4NiA3NkM4NiA3NyA4NiA3OCA4NiA3OUw4NiA5NUMxMDAgMTAwIDEwMCAxMDAgMTAwIDEwMEw5MCA5NUw5MCA5NUw5MCA5NUw5MCA5NUw3NSA5NUw3NSA5NUw3NSA5NUw3NSA5NUw2MCA5NUw2MCA5NUw2MCA5NUw2MCA5NUw0NSA5NUw0NSA5NUw0NSA5NUw0NSA5NUwzMCA5NUwzMCA5NUwzMCA5NUwzMCA5NUwzMCA5MFoiIGZpbGw9IiNGRkE1MDAiLz4KPHBhdGggZD0iTTMwIDk1VjExMEgxMDBWOTVMMzAgOTVaIiBmaWxsPSIjRkZEQjAwIi8+CjxwYXRoIGQ9Ik0zMCAxMTBWMTI1SDEwMFYxMTBMMzAgMTEwWiIgZmlsbD0iI0ZGREIwMCIvPgo8cGF0aCBkPSJNMzAgMTI1VjE0MEgxMDBWMTI1TDMwIDEyNVoiIGZpbGw9IiNGRkRCMDAiLz4KPHBhdGggZD0iTTMwIDE0MFYxNTVIMTAwVjE0MEwzMCAxNDBaIiBmaWxsPSIjRkZEQjAwIi8+CjxwYXRoIGQ9Ik0zMCAxNTVWMTcwSDEwMFYxNTVMMzAgMTU1WiIgZmlsbD0iI0ZGREIwMCIvPgo8cGF0aCBkPSJNMzAgMTcwVjE4NEgxMDBWMTcwTDMwIDE3MFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NCIgZmlsbD0iI0ZGREIwMCIvPgo8cGF0aCBkPSJNMzAgMTg0VjE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NCIgZmlsbD0iI0ZGREIwMCIvPgo8cGF0aCBkPSJNMzAgMTg0VjE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPHBhdGggZD0iTTMwIDE4NEgxMDBWMTg0TDMwIDE4NFoiIGZpbGw9IiNGRkQ4MDAiLz4KPGVsbGlwc2UgY3g9IjQ1IiBjeT0iODQiIHJ4PSI0IiByeT0iNiIgZmlsbD0iIzIyQzU1RSIvPgo8ZWxsaXBzZSBjeD0iNTQiIGN5PSI4NCIgcng9IjMiIHJ5PSI2IiBmaWxsPSIjMjJDNTVFIi8+CjxlbGxpcHNlIGN4PSI2MiIgY3k9Ijg0IiByeD0iMyIgcnk9IjYiIGZpbGw9IiMyMkM1NUUiLz4KPGVsbGlwc2UgY3g9IjcwIiBjeT0iODQiIHJ4PSI0IiByeT0iNiIgZmlsbD0iIzIyQzU1RSIvPgo8ZWxsaXBzZSBjeD0iNzgiIGN5PSI4NCIgcng9IjMiIHJ5PSI2IiBmaWxsPSIjMjJDNTVFIi8+CjxlbGxpcHNlIGN4PSI4NiIgY3k9Ijg0IiByeD0iMyIgcnk9IjYiIGZpbGw9IiMyMkM1NUUiLz4KPGVsbGlwc2UgY3g9Ijk0IiBjeT0iODQiIHJ4PSI0IiByeT0iNiIgZmlsbD0iIzIyQzU1RSIvPgo8dGV4dCB4PSI2NSIgeT0iMjAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSJib2xkIiBmaWxsPSIjMDAzMzMzIiBkb21pbmFudC1iYXNlbGluZT0iY2VudHJhbCIgdGV4dC1hbmNob3I9Im1pZGRsZSI+TFVTVCBBVUY8L3RleHQ+Cjx0ZXh0IHg9IjY1IiB5PSIyMTYiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxMCIgZm9udC13ZWlnaHQ9ImJvbGQiIGZpbGw9IiMwMDMzMzMiIGRvbWluYW50LWJhc2VsaW5lPSJjZW50cmFsIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5MQU5EV0lSVFNDSEFGVDwvdGV4dD4KPC9zdmc+Cgo="
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
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Choose Your Virtual Plot</h2>
        <p className="text-lg text-gray-600">Select a real plot of land where your farming decisions will be implemented</p>
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
                  <span className="text-gray-500">Size:</span>
                  <span className="font-medium">{plot.size_acres} acres</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Soil Type:</span>
                  <span className="font-medium capitalize">{plot.soil_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Location:</span>
                  <span className="font-medium">{plot.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Price:</span>
                  <span className="font-bold text-green-600">${plot.price_per_acre}/acre</span>
                </div>
              </div>
              <button
                onClick={() => handlePlotSelection(plot)}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                Select This Plot
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
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Plan Your Farming Strategy</h2>
        <p className="text-lg text-gray-600">Make decisions that will be implemented on your selected plot: <strong>{selectedPlot?.name}</strong></p>
      </div>

      <div className="space-y-8">
        {/* Cultivation Method */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🚜 Cultivation Method</h3>
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
                <span className="capitalize font-medium">{method.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Crop Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🌾 Crop Selection</h3>
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
                <span className="capitalize font-medium">{crop}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Machine Selection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">🚜 Machine Selection</h3>
          
          <div className="space-y-6">
            {/* Cultivation Machines */}
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Cultivation Machines</h4>
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
                      <div className="text-sm text-gray-500">${machine.price_per_use}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Protection Machines */}
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Protection Machines</h4>
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
                      <div className="text-sm text-gray-500">${machine.price_per_use}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Care Machines */}
            <div>
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Care & Harvest Machines</h4>
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
                      <div className="text-sm text-gray-500">${machine.price_per_use}</div>
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
            Back to Plots
          </button>
          <button
            onClick={() => setCurrentStep('review')}
            disabled={!farmingDecision.cultivation_method || !farmingDecision.crop_type}
            className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            Review Order
          </button>
        </div>
      </div>
    </div>
  );

  const renderReviewOrder = () => (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Review Your Virtual Farm Order</h2>
        <p className="text-lg text-gray-600">Your farming decisions will be implemented on real land!</p>
      </div>

      <div className="space-y-6">
        {/* User Information */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={userInfo.name}
                onChange={(e) => setUserInfo(prev => ({ ...prev, name: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input
                type="email"
                value={userInfo.email}
                onChange={(e) => setUserInfo(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter your email"
              />
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Order Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Plot:</span>
              <span>{selectedPlot?.name} ({selectedPlot?.size_acres} acres)</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Cultivation Method:</span>
              <span className="capitalize">{farmingDecision.cultivation_method?.replace('_', ' ')}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Crop Type:</span>
              <span className="capitalize">{farmingDecision.crop_type}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="font-medium">Total Cost:</span>
              <span className="text-xl font-bold text-green-600">${calculateTotalCost().toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => setCurrentStep('farming')}
            className="bg-gray-500 text-white py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Farming
          </button>
          <button
            onClick={handleSubmitOrder}
            disabled={loading || !userInfo.name || !userInfo.email}
            className="bg-green-600 text-white py-2 px-6 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Submitting...' : 'Submit Order'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderActiveOrders = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">Active Virtual Farms</h2>
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
                {order.status.replace('_', ' ')}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div><strong>Crop:</strong> {order.farming_decision.crop_type}</div>
              <div><strong>Method:</strong> {order.farming_decision.cultivation_method?.replace('_', ' ')}</div>
              <div><strong>Total Cost:</strong> ${order.total_cost.toFixed(2)}</div>
              <div><strong>Created:</strong> {new Date(order.created_at).toLocaleDateString()}</div>
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