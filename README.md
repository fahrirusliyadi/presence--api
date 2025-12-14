# Presence API

A robust RESTful API built with Node.js and Express for managing student attendance, class data, and integrating with a face recognition service.

## 📋 Features

-   **Class Management**: Create, read, update, and delete class records.
-   **Student Management**: Manage student data and associate them with classes.
-   **Attendance System**:
    -   Automated check-in and check-out logic based on time.
    -   Integration with an external Face Recognition service for identity verification.
-   **File Serving**: Serve static files (e.g., user photos).

## 🔄 System Business Flow

The following diagram illustrates the end-to-end flow for the **Attendance Check-in/Check-out** process, demonstrating how the services interact.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Student)
    participant Client as Web App (Client)
    participant API as Presence API (Core Service)
    participant DB as Database
    participant AI as Face Rec Service (AI)

    Note over User, AI: 📸 Attendance Check-in Process

    User->>Client: Access Presence Page
    Client->>User: Request Camera Access
    User->>Client: Grant Access & Position Face
    Client->>Client: Capture Frame
    Client->>API: POST /presence (Image File)
    
    activate API
    API->>API: Check Time Constraints (Check-in vs Check-out)

    API->>AI: POST /recognize (Image)
    activate AI
    Note right of AI: Detect Face -> Encode -> Compare
    AI-->>API: Return User ID / Null
    deactivate AI

    alt Match Found
        API->>DB: Validate User Exists & Active
        API->>DB: Check for Existing Attendance Today
        
        alt Already Checked In
            API-->>Client: 400 Bad Request (Already Present)
        else Valid Check-in
            API->>DB: Create Attendance Record
            API-->>Client: 200 OK (Success Data)
        end

    else No Match / Low Confidence
        API-->>Client: 404 Not Found (User Unknown)
    end
    deactivate API

    Client-->>User: Display Success/Error Message
```

## 🛠 Tech Stack

-   **Runtime**: [Node.js](https://nodejs.org/)
-   **Framework**: [Express](https://expressjs.com/)
-   **Database**: MySQL
-   **ORM**: [Drizzle ORM](https://orm.drizzle.team/)
-   **Validation**: [Zod](https://zod.dev/)
-   **Language**: TypeScript

## 🚀 Getting Started

### Prerequisites

-   Node.js (v18 or higher)
-   MySQL Database
-   [Face Recognition Service](../presence--face-recognition) running

### Installation

1.  **Clone the repository**:
    ```bash
    git clone <repository-url>
    cd presence--api
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    DB_URL=mysql://root:password@localhost:3306/presence
    FACE_RECOGNITION_URL=http://127.0.0.1:5000
    PRESENCE_CHECKIN_TIME=07:00
    PRESENCE_CHECKOUT_TIME=14:30
    ```

4.  **Database Migration** (if applicable with Drizzle):
    ```bash
    npm run db:push
    ```

5.  **Start the Server**:
    ```bash
    npm run dev
    ```

## 📡 API Endpoints

### Classes (`/class`)

#### `GET /`
List all classes. Supports search and pagination.

-   **Query Query Params**:
    -   `search`: (string, optional) Search classes by name.
    -   `page`: (number, optional) Page number.
-   **Response**:
    ```json
    {
      "data": [
        {
          "id": 1,
          "name": "Class 10A",
          "createdAt": "2024-01-01 10:00:00",
          "updatedAt": "2024-01-01 10:00:00"
        }
      ],
      "page": 1,
      "lastPage": 2
    }
    ```

#### `GET /:id`
Retrieve a class and its students.

-   **Response**:
    ```json
    {
      "data": {
        "id": 1,
        "name": "Class 10A",
        "createdAt": "2024-01-01 10:00:00",
        "updatedAt": "2024-01-01 10:00:00",
        "students": [
          {
            "id": 1,
            "name": "John Doe",
             "//": "..."
          }
        ]
      }
    }
    ```

#### `POST /`
Create a new class.

-   **Content-Type**: `application/json`
-   **Payload**:
    ```json
    {
      "name": "Class 10B"
    }
    ```
-   **Response**: `204 No Content`

#### `PUT /:id`
Update a class.

-   **Content-Type**: `application/json`
-   **Payload**:
    ```json
    {
      "name": "Class 10C"
    }
    ```
-   **Response**: `204 No Content`

#### `DELETE /:id`
Delete a class.

-   **Response**: `204 No Content` (Fails if class has students)

### Students (`/user`)

#### `GET /`
List all students with their class info.

-   **Response**:
    ```json
    {
      "data": [
        {
          "id": 1,
          "name": "John Doe",
          "email": "john@example.com",
          "class": {
             "id": 1,
             "name": "Class 10A"
          }
        }
      ]
    }
    ```

#### `GET /:id`
Get single student details.

#### `POST /`
Register a new student.

-   **Content-Type**: `multipart/form-data`
-   **Payload**:
    -   `name`: (string) Student Name
    -   `email`: (string) Email Address
    -   `classId`: (number) ID of the class
    -   `photo`: (file, required) Photo for face recognition
-   **Response**: `204 No Content`

#### `PUT /:id`
Update student details.

#### `DELETE /:id`
Remove a student.

### Presence / Attendance (`/presence`)

#### `GET /`
Retrieve presence records for the **current day**.

-   **Response**:
    ```json
    {
      "data": [
        {
          "id": 1,
          "userId": 1,
          "date": "2024-01-01",
          "status": "present",
          "checkIn": "07:30:00",
          "checkOut": null,
          "user": {
            "id": 1,
            "name": "John Doe",
            "class": {
                "id": 1,
                "name": "Class 10A"
            }
          }
        }
      ],
      "page": 1,
      "lastPage": 5
    }
    ```

#### `POST /`
Record Check-in or Check-out. The system automatically determines the action based on the time and the user's current status for the day.

-   **Content-Type**: `multipart/form-data`
-   **Payload**:
    -   `image`: (file, required) Face image for recognition.
-   **Response**:
    ```json
    {
      "status": 200,
      "message": "Presensi masuk berhasil",
      "data": {
        "id": 1,
        "userId": 1,
        "date": "2024-01-01",
        "status": "present",
        "checkIn": "07:30:00",
        "checkOut": null,
        "user": { ... }
      }
    }
    ```

### Static Files (`/files`)

#### `GET /*`
Serve uploaded files.

-   **Example**: `GET /files/user/12345-photo.jpg`
-   **Response**: File content (image/jpeg, etc.)

## 📂 Project Structure

```
src/
├── class/          # Class module (routes, controllers, services)
├── config/         # Configuration and env vars
├── db/             # Database connection and schema
├── error/          # Error handling utilities
├── presence/       # Attendance logic
├── static/         # Static file serving
├── user/           # User/Student management
└── validation/     # Request validation schemas
```
