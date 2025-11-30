# **Photon API Integration**

## **Overview**

This collection contains essential endpoints for integrating with Photon:

- User onboarding through **Custom JWT access tokens**
- **Rewarded** and **Unrewarded** campaign event APIs
- Token refresh mechanisms for re-authentication
- Embedded wallet provisioning

This is a generic version suitable for any client integrating Photon.

---

## **Base URL**

```
https://stage-api.getstan.app/identity-service/api/v1
```

---

# **1. Onboarding Flow Using Custom JWT**

Photon allows onboarding through any backend system issuing a JWT.

To test locally or during hackathons, developers can easily generate a JWT using:

```
http://jwtbuilder.jamiekurtz.com/
```

### **Steps to Onboard a User (Generic Flow)**

1. Go to the JWT builder tool
2. Enter claims for your user (example):
    - `user_id`: "12345"
    - `email`: "test@example.com"
    - `name`: "Test User"
3. Sign the JWT with any secret (for demos, any string works)
4. Copy the generated JWT
5. Pass this JWT to Photon’s `/identity/register` endpoint

This is the preferred method for onboarding users from any partner app, game, or backend service.

---

## **1.1 Onboard User Using Custom JWT Access Token**

**Endpoint**

```
POST /identity/register
```

**Description**

Registers a user using a JWT issued by your system.

The JWT contains your user’s identity claims and ensures a unified identity mapping within Photon.

**Headers**

| Key | Value |
| --- | --- |
| Content-Type | application/json |
| X-API-Key | <Your API Key> |

**Request Body**

```json
{
  "provider": "jwt",
  "data": {
    "token": "<Your Generated JWT>",
    "client_user_id": "12345"
  }
}
```

**Response (200 OK)**

```json
{
    "success": true,
    "data": {
        "user": {
            "user": {
                "id": "f2b87b9c-3c44-4a18-9df8-8ba2b23c9911",
                "name": "",
                "avatar": "",
            },
            "user_identities": [
                {
                    "id": "6c3f7ac3-9928-4ea8-8d10-bd4b4a7ac112",
                    "user_id": "f2b87b9c-3c44-4a18-9df8-8ba2b23c9911",
                    "provider": "custom_jwt",
                    "provider_id": "12345",
            ]
        },
        "tokens": {
            "access_token": "eyJ...DLQ",
            "token_type": "Bearer",
            "expires_in": 3600,
            "refresh_token": "Zs6vE0K...",
            "scope": "read write"
        },
        "wallet": {
            "photonUserId": "f2b87b9c-3c44-4a18-9df8-8ba2b23c9911",
            "walletAddress": "0x2...58"
        }
    }
}
```

---

# **2. Campaign APIs**

Photon supports r**ewarded** and u**nrewarded** event-based campaigns.

**Rewarded events:**

Photon mints and deposits PAT tokens to the user’s wallet.

**Unrewarded events:**

Photon updates the user profile but issues **0 tokens**.

These APIs track activity such as gameplay, purchases, referrals, login streaks, challenges, etc.

---

## **2.1 Reward Campaign Event**

**Endpoint**

```
POST /attribution/events/campaign
```

**Description**

Triggers a **rewarded** event where Photon automatically mints PAT tokens based on campaign rules.

**Headers**

| Key | Value |
| --- | --- |
| Content-Type | application/json |
| X-API-Key | <Your API Key> |

**Request Body (Generic)**

```json
{
    "event_id": "game_win-1234",
    "event_type": "game_win",
    "client_user_id": "12345",
    "campaign_id": "ea3bcaca-9ce4-4b54-b803-8b9be1f142ba",
    "metadata": {},
    "timestamp": "2025-07-08T13:16:09Z"
}
```

**Response**

```json
{
    "data": {
        "success": true,
        "event_id": "game_win-1234",
        "token_amount": 2,
        "token_symbol": "PHOTON",
        "campaign_id": "ea3bcaca-9ce4-4b54-b803-8b9be1f142ba"
    },
    "success": true}
```

---

## **2.2 Unrewarded Campaign Event**

**Endpoint**

```
POST /attribution/events/campaign
```

**Description**

Triggers an **unrewarded** event — profile updated, no PAT tokens issued.

**Headers**

| Key | Value |
| --- | --- |
| Content-Type | application/json |
| X-API-Key | <Your API Key> |

**Request Body (Generic)**

```json
{
    "event_id": "daily_login-0002",
    "event_type": "daily_login",
    "client_user_id": "12345",
    "campaign_id": "ea3bcaca-9ce4-4b54-b803-8b9be1f142ba",
    "metadata": {},
    "timestamp": "2025-07-08T13:16:09Z"
}
```

**Response**

```json
{
    "data": {
        "success": true,
        "event_id": "daily_login-0002",
        "token_amount": 0,
        "token_symbol": "PHOTON",
        "campaign_id": "ea3bcaca-9ce4-4b54-b803-8b9be1f142ba"
    },
    "success": true}
```

---

# **3. Campaign Outcomes (Generic Summary)**

### **Rewarded Campaign**

- Photon verifies event
- Calculates reward
- Issues PAT tokens
- Deposits into wallet
- Updates profile

### **Unrewarded Campaign**

- Photon logs the event
- Updates user progress
- No PAT issued

## Postman Collection:


json

{
	"info": {
		"_postman_id": "64868e94-1ee7-4c1c-9e7a-5ca83f42c14b",
		"name": "Photon API Hackathon",
		"schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
		"_exporter_id": "47139722",
		"_collection_link": "https://security-specialist-61957793-3623318.postman.co/workspace/shreyansh-Singhal's-Workspace~98d461c6-a5de-41bc-8aeb-bafacf6e8a8c/collection/47139722-64868e94-1ee7-4c1c-9e7a-5ca83f42c14b?action=share&source=collection_link&creator=47139722"
	},
	"item": [
		{
			"name": "Onboarding user using STAN access token",
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "Content-Type",
						"value": "application/json"
					},
					{
						"key": "X-API-Key",
						"value": "7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800"
					}
				],
				"body": {
					"mode": "raw",
					"raw": "{\n    \"provider\": \"jwt\",\n    \"data\": {\n      \"token\": \"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3NjQzNDY5NDYsImV4cCI6MTc5NTg4Mjk0NiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoic2hyZXlqcm9ja2V0QGV4YW1wbGUuY29tIiwiRW1haWwiOiJzaHJleWpyb2NrZXRAZXhhbXBsZS5jb20ifQ.PMsSQXqGs7JCKiVrPR1srPTe_28S4Au5XaE8h7SeUFM\"\n        }\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "https://stage-api.getstan.app/identity-service/api/v1/identity/register",
					"protocol": "https",
					"host": [
						"stage-api",
						"getstan",
						"app"
					],
					"path": [
						"identity-service",
						"api",
						"v1",
						"identity",
						"register"
					]
				}
			},
			"response": [
				{
					"name": "Onboarding user using STAN access token",
					"originalRequest": {
						"method": "POST",
						"header": [
							{
								"key": "Content-Type",
								"value": "application/json"
							},
							{
								"key": "X-API-Key",
								"value": "7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800"
							}
						],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"provider\": \"jwt\",\n    \"data\": {\n      \"token\": \"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE3NjQzNDY5NDYsImV4cCI6MTc5NTg4Mjk0NiwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoic2hyZXlqcm9ja2V0QGV4YW1wbGUuY29tIiwiRW1haWwiOiJzaHJleWpyb2NrZXRAZXhhbXBsZS5jb20ifQ.PMsSQXqGs7JCKiVrPR1srPTe_28S4Au5XaE8h7SeUFM\"\n        }\n}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": {
							"raw": "https://stage-api.getstan.app/identity-service/api/v1/identity/register",
							"protocol": "https",
							"host": [
								"stage-api",
								"getstan",
								"app"
							],
							"path": [
								"identity-service",
								"api",
								"v1",
								"identity",
								"register"
							]
						}
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "",
					"header": [
						{
							"key": "Date",
							"value": "Fri, 28 Nov 2025 16:29:52 GMT"
						},
						{
							"key": "Content-Type",
							"value": "application/json"
						},
						{
							"key": "Content-Length",
							"value": "1321"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "Vary",
							"value": "Origin"
						},
						{
							"key": "Access-Control-Allow-Origin",
							"value": "*"
						},
						{
							"key": "Access-Control-Allow-Credentials",
							"value": "true"
						},
						{
							"key": "X-Ratelimit-Limit",
							"value": "10"
						},
						{
							"key": "X-Ratelimit-Remaining",
							"value": "9"
						},
						{
							"key": "X-Ratelimit-Reset",
							"value": "3"
						}
					],
					"cookie": [],
					"body": "{\n    \"success\": true,\n    \"data\": {\n        \"user\": {\n            \"user\": {\n                \"id\": \"4cc9df20-8e0b-4f32-8945-b67eea40b6cf\",\n                \"name\": \"\",\n                \"avatar\": \"\"\n            },\n            \"user_identities\": [\n                {\n                    \"user_id\": \"4cc9df20-8e0b-4f32-8945-b67eea40b6cf\",\n                    \"provider\": \"uuid\",\n                    \"provider_id\": \"shreyjrocket@example.com\",\n                    \"client_id\": \"15644ed7-a455-40d4-bfad-30b26cedc5cb\"\n                },\n                {\n                    \"user_id\": \"4cc9df20-8e0b-4f32-8945-b67eea40b6cf\",\n                    \"provider\": \"uuid\",\n                    \"provider_id\": \"shreyjrocket@example.com\",\n                    \"client_id\": \"897ec333-a7c4-4e4d-b3e3-6eb11fe2dd92\"\n                }\n            ]\n        },\n        \"tokens\": {\n            \"access_token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6bnVsbCwiaXNzIjoiMC4wLjAuMCIsInN1YiI6IjRjYzlkZjIwLThlMGItNGYzMi04OTQ1LWI2N2VlYTQwYjZjZiIsImF1ZCI6WyI4OTdlYzMzMy1hN2M0LTRlNGQtYjNlMy02ZWIxMWZlMmRkOTIiXSwiZXhwIjoxNzY0MzUwOTkyLCJpYXQiOjE3NjQzNDczOTIsIm5iZiI6MTc2NDM0NzM5MiwianRpIjoieXlXTGxsOTVZcmpzQ2xoTC1WWlNiUT09Iiwic2NvcGUiOiJyZWFkIHdyaXRlIiwiY2xpZW50X2lkIjoiODk3ZWMzMzMtYTdjNC00ZTRkLWIzZTMtNmViMTFmZTJkZDkyIiwidXNlcl9pZCI6IjRjYzlkZjIwLThlMGItNGYzMi04OTQ1LWI2N2VlYTQwYjZjZiIsImN1c3RvbV9jbGFpbXMiOnsidG9rZW5fdHlwZSI6ImFjY2Vzc190b2tlbiJ9fQ.rFEgTceCLfRPdRITm1vWPS6zSPUss66X2sohVTqS3zk\",\n            \"token_type\": \"Bearer\",\n            \"expires_in\": 3600,\n            \"refresh_token\": \"mOelGzKkL0Vdtc6DbRe9gF2ApIAyqlj-GM9WLCNqFsk=\",\n            \"scope\": \"read write\",\n            \"expires_at\": \"2025-11-28T17:29:52.504759542Z\"\n        },\n        \"wallet\": {\n            \"walletAddress\": \"0xb1fd4af46745078d3712431eaa95029016960ae0220d64fe369a7cb55b56b2d7\"\n        }\n    }\n}"
				}
			]
		},
		{
			"name": "Campaign for rewarded event",
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "Content-Type",
						"value": "application/json"
					},
					{
						"key": "X-Api-Key",
						"value": "7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800"
					},
					{
						"key": "Authorization",
						"value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6bnVsbCwiaXNzIjoiMC4wLjAuMCIsInN1YiI6IjlkYTc1NmI0LWYxOTgtNDYzYy1iNzkyLTg5ZGYzNGMwZmRkMyIsImF1ZCI6WyI4OTdlYzMzMy1hN2M0LTRlNGQtYjNlMy02ZWIxMWZlMmRkOTIiXSwiZXhwIjoxNzYyODc1NzMyLCJpYXQiOjE3NjI4NzIxMzIsIm5iZiI6MTc2Mjg3MjEzMiwianRpIjoibDdDd3ZYNlB4cU9nV2diMlVDZnpBdz09Iiwic2NvcGUiOiJyZWFkIHdyaXRlIiwiY2xpZW50X2lkIjoiODk3ZWMzMzMtYTdjNC00ZTRkLWIzZTMtNmViMTFmZTJkZDkyIiwidXNlcl9pZCI6IjlkYTc1NmI0LWYxOTgtNDYzYy1iNzkyLTg5ZGYzNGMwZmRkMyIsImN1c3RvbV9jbGFpbXMiOnsidG9rZW5fdHlwZSI6ImFjY2Vzc190b2tlbiJ9fQ.xRogAW8J-1HqHbluhbw9vlLohU4g58Q0kW5ABpkrOSE"
					}
				],
				"body": {
					"mode": "raw",
					"raw": "{\n    \"event_id\": \"game_win-2193\",\n    \"event_type\": \"game_win\",\n    \"user_id\": \"4cc9df20-8e0b-4f32-8945-b67eea40b6cf\",\n    \"campaign_id\": \"ea3bcaca-9ce4-4b54-b803-8b9be1f142ba\",\n    \"metadata\": {\n    },\n    \"timestamp\": \"2025-07-08T13:16:09Z\"\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "https://stage-api.getstan.app/identity-service/api/v1/attribution/events/campaign",
					"protocol": "https",
					"host": [
						"stage-api",
						"getstan",
						"app"
					],
					"path": [
						"identity-service",
						"api",
						"v1",
						"attribution",
						"events",
						"campaign"
					]
				}
			},
			"response": [
				{
					"name": "Campaign for rewarded event",
					"originalRequest": {
						"method": "POST",
						"header": [
							{
								"key": "Content-Type",
								"value": "application/json"
							},
							{
								"key": "X-Api-Key",
								"value": "7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800"
							},
							{
								"key": "Authorization",
								"value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6bnVsbCwiaXNzIjoiMC4wLjAuMCIsInN1YiI6IjlkYTc1NmI0LWYxOTgtNDYzYy1iNzkyLTg5ZGYzNGMwZmRkMyIsImF1ZCI6WyI4OTdlYzMzMy1hN2M0LTRlNGQtYjNlMy02ZWIxMWZlMmRkOTIiXSwiZXhwIjoxNzYyODc1NzMyLCJpYXQiOjE3NjI4NzIxMzIsIm5iZiI6MTc2Mjg3MjEzMiwianRpIjoibDdDd3ZYNlB4cU9nV2diMlVDZnpBdz09Iiwic2NvcGUiOiJyZWFkIHdyaXRlIiwiY2xpZW50X2lkIjoiODk3ZWMzMzMtYTdjNC00ZTRkLWIzZTMtNmViMTFmZTJkZDkyIiwidXNlcl9pZCI6IjlkYTc1NmI0LWYxOTgtNDYzYy1iNzkyLTg5ZGYzNGMwZmRkMyIsImN1c3RvbV9jbGFpbXMiOnsidG9rZW5fdHlwZSI6ImFjY2Vzc190b2tlbiJ9fQ.xRogAW8J-1HqHbluhbw9vlLohU4g58Q0kW5ABpkrOSE"
							}
						],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"event_id\": \"game_win-2193\",\n    \"event_type\": \"game_win\",\n    \"user_id\": \"4cc9df20-8e0b-4f32-8945-b67eea40b6cf\",\n    \"campaign_id\": \"ea3bcaca-9ce4-4b54-b803-8b9be1f142ba\",\n    \"metadata\": {\n    },\n    \"timestamp\": \"2025-07-08T13:16:09Z\"\n}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": {
							"raw": "https://stage-api.getstan.app/identity-service/api/v1/attribution/events/campaign",
							"protocol": "https",
							"host": [
								"stage-api",
								"getstan",
								"app"
							],
							"path": [
								"identity-service",
								"api",
								"v1",
								"attribution",
								"events",
								"campaign"
							]
						}
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "",
					"header": [
						{
							"key": "Date",
							"value": "Fri, 28 Nov 2025 16:32:02 GMT"
						},
						{
							"key": "Content-Type",
							"value": "application/json"
						},
						{
							"key": "Content-Length",
							"value": "164"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "Vary",
							"value": "Origin"
						},
						{
							"key": "Access-Control-Allow-Origin",
							"value": "*"
						},
						{
							"key": "Access-Control-Allow-Credentials",
							"value": "true"
						},
						{
							"key": "X-Ratelimit-Limit",
							"value": "10"
						},
						{
							"key": "X-Ratelimit-Remaining",
							"value": "9"
						},
						{
							"key": "X-Ratelimit-Reset",
							"value": "3"
						}
					],
					"cookie": [],
					"body": "{\n    \"data\": {\n        \"success\": true,\n        \"event_id\": \"game_win-2193\",\n        \"token_amount\": 0.05,\n        \"token_symbol\": \"PHOTON\",\n        \"campaign_id\": \"ea3bcaca-9ce4-4b54-b803-8b9be1f142ba\"\n    },\n    \"success\": true\n}"
				}
			]
		},
		{
			"name": "Campaign for unrewarded event",
			"request": {
				"method": "POST",
				"header": [
					{
						"key": "Content-Type",
						"value": "application/json"
					},
					{
						"key": "X-Api-Key",
						"value": "7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800"
					},
					{
						"key": "Authorization",
						"value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6bnVsbCwiaXNzIjoiMC4wLjAuMCIsInN1YiI6IjlkYTc1NmI0LWYxOTgtNDYzYy1iNzkyLTg5ZGYzNGMwZmRkMyIsImF1ZCI6WyI4OTdlYzMzMy1hN2M0LTRlNGQtYjNlMy02ZWIxMWZlMmRkOTIiXSwiZXhwIjoxNzYyODc1NzMyLCJpYXQiOjE3NjI4NzIxMzIsIm5iZiI6MTc2Mjg3MjEzMiwianRpIjoibDdDd3ZYNlB4cU9nV2diMlVDZnpBdz09Iiwic2NvcGUiOiJyZWFkIHdyaXRlIiwiY2xpZW50X2lkIjoiODk3ZWMzMzMtYTdjNC00ZTRkLWIzZTMtNmViMTFmZTJkZDkyIiwidXNlcl9pZCI6IjlkYTc1NmI0LWYxOTgtNDYzYy1iNzkyLTg5ZGYzNGMwZmRkMyIsImN1c3RvbV9jbGFpbXMiOnsidG9rZW5fdHlwZSI6ImFjY2Vzc190b2tlbiJ9fQ.xRogAW8J-1HqHbluhbw9vlLohU4g58Q0kW5ABpkrOSE"
					}
				],
				"body": {
					"mode": "raw",
					"raw": "{\n    \"event_id\": \"daily_login-2198\",\n    \"event_type\": \"daily_login\",\n    \"user_id\": \"4cc9df20-8e0b-4f32-8945-b67eea40b6cf\",\n    \"campaign_id\": \"ea3bcaca-9ce4-4b54-b803-8b9be1f142ba\",\n    \"metadata\": {\n    },\n    \"timestamp\": \"2025-07-08T13:16:09Z\"\n}",
					"options": {
						"raw": {
							"language": "json"
						}
					}
				},
				"url": {
					"raw": "https://stage-api.getstan.app/identity-service/api/v1/attribution/events/campaign",
					"protocol": "https",
					"host": [
						"stage-api",
						"getstan",
						"app"
					],
					"path": [
						"identity-service",
						"api",
						"v1",
						"attribution",
						"events",
						"campaign"
					]
				}
			},
			"response": [
				{
					"name": "Campaign for unrewarded event",
					"originalRequest": {
						"method": "POST",
						"header": [
							{
								"key": "Content-Type",
								"value": "application/json"
							},
							{
								"key": "X-Api-Key",
								"value": "7bc5d06eb53ad73716104742c7e8a5377da9fe8156378dcfebfb8253da4e8800"
							},
							{
								"key": "Authorization",
								"value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6bnVsbCwiaXNzIjoiMC4wLjAuMCIsInN1YiI6IjlkYTc1NmI0LWYxOTgtNDYzYy1iNzkyLTg5ZGYzNGMwZmRkMyIsImF1ZCI6WyI4OTdlYzMzMy1hN2M0LTRlNGQtYjNlMy02ZWIxMWZlMmRkOTIiXSwiZXhwIjoxNzYyODc1NzMyLCJpYXQiOjE3NjI4NzIxMzIsIm5iZiI6MTc2Mjg3MjEzMiwianRpIjoibDdDd3ZYNlB4cU9nV2diMlVDZnpBdz09Iiwic2NvcGUiOiJyZWFkIHdyaXRlIiwiY2xpZW50X2lkIjoiODk3ZWMzMzMtYTdjNC00ZTRkLWIzZTMtNmViMTFmZTJkZDkyIiwidXNlcl9pZCI6IjlkYTc1NmI0LWYxOTgtNDYzYy1iNzkyLTg5ZGYzNGMwZmRkMyIsImN1c3RvbV9jbGFpbXMiOnsidG9rZW5fdHlwZSI6ImFjY2Vzc190b2tlbiJ9fQ.xRogAW8J-1HqHbluhbw9vlLohU4g58Q0kW5ABpkrOSE"
							}
						],
						"body": {
							"mode": "raw",
							"raw": "{\n    \"event_id\": \"daily_login-2198\",\n    \"event_type\": \"daily_login\",\n    \"user_id\": \"4cc9df20-8e0b-4f32-8945-b67eea40b6cf\",\n    \"campaign_id\": \"ea3bcaca-9ce4-4b54-b803-8b9be1f142ba\",\n    \"metadata\": {\n    },\n    \"timestamp\": \"2025-07-08T13:16:09Z\"\n}",
							"options": {
								"raw": {
									"language": "json"
								}
							}
						},
						"url": {
							"raw": "https://stage-api.getstan.app/identity-service/api/v1/attribution/events/campaign",
							"protocol": "https",
							"host": [
								"stage-api",
								"getstan",
								"app"
							],
							"path": [
								"identity-service",
								"api",
								"v1",
								"attribution",
								"events",
								"campaign"
							]
						}
					},
					"status": "OK",
					"code": 200,
					"_postman_previewlanguage": "",
					"header": [
						{
							"key": "Date",
							"value": "Fri, 28 Nov 2025 16:31:45 GMT"
						},
						{
							"key": "Content-Type",
							"value": "application/json"
						},
						{
							"key": "Content-Length",
							"value": "164"
						},
						{
							"key": "Connection",
							"value": "keep-alive"
						},
						{
							"key": "Vary",
							"value": "Origin"
						},
						{
							"key": "Access-Control-Allow-Origin",
							"value": "*"
						},
						{
							"key": "Access-Control-Allow-Credentials",
							"value": "true"
						},
						{
							"key": "X-Ratelimit-Limit",
							"value": "10"
						},
						{
							"key": "X-Ratelimit-Remaining",
							"value": "9"
						},
						{
							"key": "X-Ratelimit-Reset",
							"value": "3"
						}
					],
					"cookie": [],
					"body": "{\n    \"data\": {\n        \"success\": true,\n        \"event_id\": \"daily_login-2198\",\n        \"token_amount\": 0,\n        \"token_symbol\": \"PHOTON\",\n        \"campaign_id\": \"ea3bcaca-9ce4-4b54-b803-8b9be1f142ba\"\n    },\n    \"success\": true\n}"
				}
			]
		}
	]
}