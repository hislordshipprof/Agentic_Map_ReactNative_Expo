-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "preferences" JSONB,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anchors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "anchors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "google_places_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER,
    "opening_hours" JSONB,
    "category" TEXT,
    "cached_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "start_latitude" DOUBLE PRECISION NOT NULL,
    "start_longitude" DOUBLE PRECISION NOT NULL,
    "end_latitude" DOUBLE PRECISION NOT NULL,
    "end_longitude" DOUBLE PRECISION NOT NULL,
    "stops" JSONB NOT NULL,
    "total_distance_m" INTEGER NOT NULL,
    "total_time_min" INTEGER NOT NULL,
    "optimization_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_history" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "user_message" TEXT NOT NULL,
    "intent" TEXT,
    "intent_confidence" DOUBLE PRECISION,
    "entities" JSONB,
    "system_response" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "anchors_user_id_idx" ON "anchors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "places_google_places_id_key" ON "places"("google_places_id");

-- CreateIndex
CREATE INDEX "places_expires_at_idx" ON "places"("expires_at");

-- CreateIndex
CREATE INDEX "routes_user_id_idx" ON "routes"("user_id");

-- CreateIndex
CREATE INDEX "conversation_history_user_id_idx" ON "conversation_history"("user_id");

-- CreateIndex
CREATE INDEX "conversation_history_timestamp_idx" ON "conversation_history"("timestamp");

-- AddForeignKey
ALTER TABLE "anchors" ADD CONSTRAINT "anchors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_history" ADD CONSTRAINT "conversation_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
