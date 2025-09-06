production: up

development: install build dev

# --- Docker Commands ---

up:
	@echo "Building and starting services with Docker Compose..."
	docker-compose up --build

down:
	@echo "Stopping Docker containers..."
	docker-compose down

clean:
	@echo "Stopping containers and removing volumes..."
	docker-compose down -v --rmi all --remove-orphans
	@echo "Pruning unused Docker data..."
	docker system prune -af
	docker volume prune -f

# --- Local Development Commands ---

install:
	@echo "Installing frontend dependencies..."
	cd frontend && npm install
	@echo "Installing backend dependencies..."
	cd backend && npm install

build:
	@echo "Building frontend..."
	cd frontend && npm run build

dev:
	@echo "Starting backend dev server..."
	cd backend && npm run dev

# --- Clean ---

fclean: clean
	@echo "Removing all node_modules and dist directories..."
	rm -rf frontend/node_modules
	rm -rf backend/node_modules
	rm -rf frontend/dist


.PHONY: all up down clean fclean re dev build install