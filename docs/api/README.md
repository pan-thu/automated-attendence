# API Documentation

## Viewing the OpenAPI Documentation

### Option 1: Redocly CLI (Recommended)

Install Redocly CLI globally:
```bash
npm install -g @redocly/cli
```

Build static HTML documentation:
```bash
redocly build-docs docs/api/openapi.yaml --output docs/api/index.html
```

Preview documentation:
```bash
redocly preview-docs docs/api/openapi.yaml
```

### Option 2: Swagger UI

Visit [Swagger Editor](https://editor.swagger.io/) and paste the contents of `openapi.yaml`.

### Option 3: VS Code Extension

Install the **OpenAPI (Swagger) Editor** extension in VS Code and open `openapi.yaml`.

## API Endpoint Structure

All Firebase Cloud Functions are callable functions accessed via:
```
https://us-central1-{your-project-id}.cloudfunctions.net/{functionName}
```

## Authentication

All endpoints require Firebase Authentication. Include the ID token in the Authorization header:
```
Authorization: Bearer {firebase-id-token}
```

## Key Endpoints

### Employee Operations
- `handleClockIn` - Record attendance check-ins
- `getEmployeeDashboard` - Get daily summary and stats
- `submitLeaveRequest` - Submit leave applications
- `listEmployeeAttendance` - View attendance history

### Admin Operations
- `createEmployee` - Create new employee accounts
- `updateCompanySettings` - Configure system settings
- `handleLeaveApproval` - Approve/reject leave requests
- `manualSetAttendance` - Manually adjust attendance records

### Attachment Management
- `generateLeaveAttachmentUploadUrl` - Get signed upload URL
- `registerLeaveAttachment` - Validate uploaded file

## Testing

Use tools like Postman or cURL to test endpoints. Example:

```bash
curl -X POST \
  https://us-central1-your-project-id.cloudfunctions.net/handleClockIn \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitude": 13.756331,
    "longitude": 100.501762,
    "isMocked": false
  }'
```

## Error Codes

| Code | Description |
|------|-------------|
| `invalid-argument` | Invalid request parameters |
| `permission-denied` | Insufficient permissions or inactive account |
| `unauthenticated` | Missing or invalid authentication token |
| `not-found` | Resource not found |
| `failed-precondition` | Operation precondition not met (e.g., outside geofence, insufficient balance) |
| `deadline-exceeded` | Request timeout or expired resource |
| `internal` | Server-side error |

## Security Notes

- All business logic validation occurs server-side
- Geofence validation is server-authoritative
- Mock location detection rejects spoofed GPS
- File uploads validated via magic byte inspection
- All admin operations require `admin` custom claim

## Rate Limiting

Firebase Cloud Functions have built-in quotas. For production, consider:
- 1000 invocations/min for free tier
- 10K invocations/min for Blaze plan

## Support

For API support, contact: support@example.com
