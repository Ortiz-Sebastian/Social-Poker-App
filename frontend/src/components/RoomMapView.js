import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import { Badge } from './Badge';

const AREA_RADIUS_METERS = 350;

const ROOM_COLOR = '#4a90d9';
const ROOM_COLOR_SELECTED = '#1a1a2e';

export const RoomMapView = ({
  rooms,
  userLocation,
  searchRadius,
  selectedRoom,
  onSelectRoom,
  onDeselectRoom,
  onRoomPress,
}) => {
  const mapRef = useRef(null);

  useEffect(() => {
    if (rooms.length > 0 && mapRef.current) {
      const coords = rooms
        .filter((r) => r.public_latitude && r.public_longitude)
        .map((r) => ({
          latitude: r.public_latitude,
          longitude: r.public_longitude,
        }));

      if (userLocation) {
        coords.push(userLocation);
      }

      if (coords.length > 0) {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 80, right: 60, bottom: selectedRoom ? 280 : 80, left: 60 },
          animated: true,
        });
      }
    }
  }, [rooms]);

  const handleMarkerPress = (room) => {
    onSelectRoom(room);
    if (mapRef.current && room.public_latitude && room.public_longitude) {
      mapRef.current.animateToRegion(
        {
          latitude: room.public_latitude - 0.003,
          longitude: room.public_longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        300
      );
    }
  };

  if (!userLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ROOM_COLOR} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  const radiusInDegrees = (searchRadius || 10000) / 111000;
  const region = {
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: radiusInDegrees * 2.5,
    longitudeDelta: radiusInDegrees * 2.5,
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
        onPress={() => onDeselectRoom()}
      >
        {/* Search radius circle */}
        {searchRadius && (
          <Circle
            center={userLocation}
            radius={searchRadius}
            strokeColor="rgba(74, 144, 217, 0.25)"
            fillColor="rgba(74, 144, 217, 0.04)"
            strokeWidth={1}
          />
        )}

        {/* Room markers (Airbnb-style) */}
        {rooms.map((room) => {
          if (!room.public_latitude || !room.public_longitude) return null;
          const isSelected = selectedRoom?.id === room.id;
          return (
            <Marker
              key={room.id}
              coordinate={{
                latitude: room.public_latitude,
                longitude: room.public_longitude,
              }}
              onSelect={() => handleMarkerPress(room)}
              onDeselect={() => onDeselectRoom()}
              anchor={{ x: 0.5, y: 0.5 }}
              stopPropagation
            >
              <View style={[styles.areaMarker, isSelected && styles.areaMarkerSelected]}>
                <View style={[styles.dot, isSelected && styles.dotSelected]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Approximate location disclaimer */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>Locations are approximate</Text>
      </View>

      {/* Bottom preview card */}
      {selectedRoom && (
        <TouchableOpacity
          style={styles.previewCard}
          activeOpacity={0.9}
          onPress={() => onRoomPress(selectedRoom)}
        >
          <View style={styles.previewHeader}>
            <Text style={styles.previewName} numberOfLines={1}>
              {selectedRoom.name}
            </Text>
            <Badge text={selectedRoom.status} variant={selectedRoom.status} />
          </View>

          <View style={styles.previewBadges}>
            {selectedRoom.skill_level && (
              <Badge text={selectedRoom.skill_level} variant={selectedRoom.skill_level} />
            )}
          </View>

          <View style={styles.previewDetails}>
            <Text style={styles.previewDetail}>
              {selectedRoom.max_players ? `Max ${selectedRoom.max_players} players` : 'No player limit'}
            </Text>
            {selectedRoom.buy_in_info && (
              <Text style={styles.previewDetail}>{selectedRoom.buy_in_info}</Text>
            )}
          </View>

          {selectedRoom.distance_meters && (
            <Text style={styles.previewDistance}>
              {selectedRoom.distance_meters < 1000
                ? `${Math.round(selectedRoom.distance_meters)} m away`
                : `${(selectedRoom.distance_meters / 1000).toFixed(1)} km away`}
            </Text>
          )}

          {selectedRoom.description && (
            <Text style={styles.previewDescription} numberOfLines={2}>
              {selectedRoom.description}
            </Text>
          )}

          <View style={styles.previewCta}>
            <Text style={styles.previewCtaText}>Tap for details</Text>
            <Text style={styles.previewCtaArrow}>&rsaquo;</Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  areaMarker: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(74, 144, 217, 0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(74, 144, 217, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  areaMarkerSelected: {
    backgroundColor: 'rgba(26, 26, 46, 0.18)',
    borderColor: 'rgba(26, 26, 46, 0.5)',
    borderWidth: 2,
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: ROOM_COLOR,
    borderWidth: 2.5,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  dotSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: ROOM_COLOR_SELECTED,
    borderColor: ROOM_COLOR,
    borderWidth: 3,
  },
  disclaimer: {
    position: 'absolute',
    top: 12,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  disclaimerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '500',
  },
  previewCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    flex: 1,
    marginRight: 8,
  },
  previewBadges: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  previewDetails: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  previewDetail: {
    fontSize: 13,
    color: '#666',
  },
  previewDistance: {
    fontSize: 13,
    fontWeight: '600',
    color: ROOM_COLOR,
    marginTop: 6,
  },
  previewDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 6,
    lineHeight: 18,
  },
  previewCta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  previewCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: ROOM_COLOR,
  },
  previewCtaArrow: {
    fontSize: 20,
    color: ROOM_COLOR,
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666',
  },
});
