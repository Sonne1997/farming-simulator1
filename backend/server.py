from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums for farming choices
class SoilType(str, Enum):
    CLAY = "clay"
    SANDY = "sandy"
    LOAMY = "loamy"
    SILT = "silt"

class CropType(str, Enum):
    WHEAT = "wheat"
    CORN = "corn"
    SOYBEANS = "soybeans"
    POTATOES = "potatoes"
    CARROTS = "carrots"
    LETTUCE = "lettuce"
    TOMATOES = "tomatoes"
    ONIONS = "onions"

class CultivationMethod(str, Enum):
    CONVENTIONAL = "conventional"
    NO_TILL = "no_till"
    ORGANIC = "organic"
    PRECISION = "precision"

class MachineType(str, Enum):
    TRACTOR = "tractor"
    PLOW = "plow"
    SEEDER = "seeder"
    HARVESTER = "harvester"
    SPRAYER = "sprayer"
    CULTIVATOR = "cultivator"

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    IMPLEMENTING = "implementing"
    GROWING = "growing"
    HARVEST_READY = "harvest_ready"
    COMPLETED = "completed"

# Data Models
class Plot(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    size_acres: float
    soil_type: SoilType
    location: str
    description: str
    price_per_acre: float
    available: bool = True
    image_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlotCreate(BaseModel):
    name: str
    size_acres: float
    soil_type: SoilType
    location: str
    description: str
    price_per_acre: float
    image_url: Optional[str] = None

class Machine(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: MachineType
    description: str
    price_per_use: float
    suitable_for: List[CropType]
    image_url: Optional[str] = None

class MachineCreate(BaseModel):
    name: str
    type: MachineType
    description: str
    price_per_use: float
    suitable_for: List[CropType]
    image_url: Optional[str] = None

class FarmingDecision(BaseModel):
    cultivation_method: CultivationMethod
    crop_type: CropType
    cultivation_machines: List[str]  # machine IDs
    protection_machines: List[str]  # machine IDs
    care_machines: List[str]  # machine IDs

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_name: str
    user_email: str
    plot_id: str
    farming_decision: FarmingDecision
    total_cost: float
    status: OrderStatus = OrderStatus.PENDING
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class OrderCreate(BaseModel):
    user_name: str
    user_email: str
    plot_id: str
    farming_decision: FarmingDecision
    notes: Optional[str] = None

class OrderUpdate(BaseModel):
    status: OrderStatus
    notes: Optional[str] = None

# Routes
@api_router.get("/")
async def root():
    return {"message": "Virtual Farming Platform API"}

# Plot management
@api_router.get("/plots", response_model=List[Plot])
async def get_plots():
    plots = await db.plots.find({"available": True}).to_list(1000)
    return [Plot(**plot) for plot in plots]

@api_router.get("/plots/{plot_id}", response_model=Plot)
async def get_plot(plot_id: str):
    plot = await db.plots.find_one({"id": plot_id})
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    return Plot(**plot)

@api_router.post("/plots", response_model=Plot)
async def create_plot(plot_data: PlotCreate):
    plot = Plot(**plot_data.dict())
    await db.plots.insert_one(plot.dict())
    return plot

# Machine management
@api_router.get("/machines", response_model=List[Machine])
async def get_machines():
    machines = await db.machines.find().to_list(1000)
    return [Machine(**machine) for machine in machines]

@api_router.get("/machines/{machine_type}")
async def get_machines_by_type(machine_type: MachineType):
    machines = await db.machines.find({"type": machine_type}).to_list(1000)
    return [Machine(**machine) for machine in machines]

@api_router.post("/machines", response_model=Machine)
async def create_machine(machine_data: MachineCreate):
    machine = Machine(**machine_data.dict())
    await db.machines.insert_one(machine.dict())
    return machine

# Order management
@api_router.post("/orders", response_model=Order)
async def create_order(order_data: OrderCreate):
    # Calculate total cost
    plot = await db.plots.find_one({"id": order_data.plot_id})
    if not plot:
        raise HTTPException(status_code=404, detail="Plot not found")
    
    plot_cost = plot["size_acres"] * plot["price_per_acre"]
    
    # Get machine costs
    all_machine_ids = (order_data.farming_decision.cultivation_machines + 
                      order_data.farming_decision.protection_machines + 
                      order_data.farming_decision.care_machines)
    
    machine_cost = 0
    for machine_id in all_machine_ids:
        machine = await db.machines.find_one({"id": machine_id})
        if machine:
            machine_cost += machine["price_per_use"]
    
    total_cost = plot_cost + machine_cost
    
    order = Order(**order_data.dict(), total_cost=total_cost)
    await db.orders.insert_one(order.dict())
    
    # Mark plot as unavailable
    await db.plots.update_one({"id": order_data.plot_id}, {"$set": {"available": False}})
    
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders():
    orders = await db.orders.find().to_list(1000)
    return [Order(**order) for order in orders]

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.patch("/orders/{order_id}", response_model=Order)
async def update_order(order_id: str, order_update: OrderUpdate):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = order_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated_order = await db.orders.find_one({"id": order_id})
    return Order(**updated_order)

# Initialize sample data
@api_router.post("/initialize-data")
async def initialize_sample_data():
    # Clear existing data
    await db.plots.delete_many({})
    await db.machines.delete_many({})
    
    # Create sample plots
    sample_plots = [
        PlotCreate(
            name="Sunny Meadow Plot",
            size_acres=2.5,
            soil_type=SoilType.LOAMY,
            location="North Field, Bavaria",
            description="Prime agricultural land with excellent drainage and southern exposure",
            price_per_acre=150.0,
            image_url="https://images.unsplash.com/photo-1529313780224-1a12b68bed16?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwxfHxmYXJtaW5nfGVufDB8fHxncmVlbnwxNzUyODI5NTkzfDA&ixlib=rb-4.1.0&q=85"
        ),
        PlotCreate(
            name="Valley View Acres",
            size_acres=4.0,
            soil_type=SoilType.CLAY,
            location="South Valley, Bavaria",
            description="Fertile clay soil perfect for root vegetables and grains",
            price_per_acre=120.0,
            image_url="https://images.unsplash.com/photo-1523539693385-e5e891eb4465?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwzfHxmYXJtaW5nfGVufDB8fHxncmVlbnwxNzUyODI5NTkzfDA&ixlib=rb-4.1.0&q=85"
        ),
        PlotCreate(
            name="Highland Fields",
            size_acres=3.0,
            soil_type=SoilType.SANDY,
            location="East Highland, Bavaria",
            description="Well-drained sandy soil ideal for organic farming",
            price_per_acre=100.0,
            image_url="https://images.unsplash.com/photo-1492496913980-501348b61469?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzF8MHwxfHNlYXJjaHwyfHxmYXJtaW5nfGVufDB8fHxncmVlbnwxNzUyODI5NTkzfDA&ixlib=rb-4.1.0&q=85"
        )
    ]
    
    for plot_data in sample_plots:
        plot = Plot(**plot_data.dict())
        await db.plots.insert_one(plot.dict())
    
    # Create sample machines
    sample_machines = [
        MachineCreate(
            name="John Deere 6120M Tractor",
            type=MachineType.TRACTOR,
            description="120 HP utility tractor perfect for medium-sized operations",
            price_per_use=80.0,
            suitable_for=[CropType.WHEAT, CropType.CORN, CropType.SOYBEANS],
            image_url="https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg"
        ),
        MachineCreate(
            name="Precision Planter",
            type=MachineType.SEEDER,
            description="GPS-guided precision planter for optimal seed placement",
            price_per_use=60.0,
            suitable_for=[CropType.CORN, CropType.SOYBEANS, CropType.POTATOES],
            image_url="https://images.pexels.com/photos/594059/pexels-photo-594059.jpeg"
        ),
        MachineCreate(
            name="Organic Sprayer",
            type=MachineType.SPRAYER,
            description="Eco-friendly sprayer for organic pest control",
            price_per_use=40.0,
            suitable_for=[CropType.LETTUCE, CropType.TOMATOES, CropType.CARROTS],
            image_url="https://images.pexels.com/photos/833895/pexels-photo-833895.jpeg"
        ),
        MachineCreate(
            name="Disc Harrow",
            type=MachineType.CULTIVATOR,
            description="Heavy-duty disc harrow for primary tillage",
            price_per_use=50.0,
            suitable_for=[CropType.WHEAT, CropType.CORN, CropType.SOYBEANS],
            image_url="https://images.pexels.com/photos/96417/pexels-photo-96417.jpeg"
        ),
        MachineCreate(
            name="Combine Harvester",
            type=MachineType.HARVESTER,
            description="Modern combine harvester for efficient grain harvest",
            price_per_use=150.0,
            suitable_for=[CropType.WHEAT, CropType.CORN, CropType.SOYBEANS],
            image_url="https://images.pexels.com/photos/594059/pexels-photo-594059.jpeg"
        ),
        MachineCreate(
            name="Vegetable Harvester",
            type=MachineType.HARVESTER,
            description="Specialized harvester for root vegetables and leafy greens",
            price_per_use=90.0,
            suitable_for=[CropType.CARROTS, CropType.LETTUCE, CropType.ONIONS],
            image_url="https://images.pexels.com/photos/833895/pexels-photo-833895.jpeg"
        )
    ]
    
    for machine_data in sample_machines:
        machine = Machine(**machine_data.dict())
        await db.machines.insert_one(machine.dict())
    
    return {"message": "Sample data initialized successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()