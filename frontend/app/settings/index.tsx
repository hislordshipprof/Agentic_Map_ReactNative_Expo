/**
 * Settings Screen - Agentic Mobile Map
 *
 * Premium dark theme settings with glassmorphism design.
 * Allows users to set Home and Work addresses with address search
 * and current location capture.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';

import { useUserAnchors } from '@/hooks/useUserAnchors';
import { useLocation } from '@/hooks/useLocation';
import { Colors, Spacing, FontFamily, FontSize, Layout } from '@/theme';
import type { AnchorType, Anchor } from '@/types/user';
import type { LatLng } from '@/types/route';

/**
 * Address search result
 */
interface SearchResult {
  id: string;
  name: string;
  address: string;
  location: LatLng;
}

/**
 * Animated Pressable for anchor cards
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Anchor Card Component - Displays saved home/work location
 */
const AnchorCard: React.FC<{
  type: AnchorType;
  anchor?: Anchor;
  onEdit: () => void;
  onDelete: () => void;
  index: number;
}> = ({ type, anchor, onEdit, onDelete, index }) => {
  const scale = useSharedValue(1);
  const isHome = type === 'home';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, { damping: 15 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15 });
  };

  const iconName = isHome ? 'home' : 'briefcase';
  const title = isHome ? 'Home' : 'Work';
  const gradientColors = isHome
    ? ['rgba(20, 184, 166, 0.12)', 'rgba(20, 184, 166, 0.04)']
    : ['rgba(99, 102, 241, 0.12)', 'rgba(99, 102, 241, 0.04)'];
  const accentColor = isHome ? Colors.primary.teal : '#6366F1';

  return (
    <Animated.View
      entering={FadeInUp.delay(100 + index * 80).duration(500)}
      style={animatedStyle}
    >
      <AnimatedPressable
        onPress={onEdit}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.anchorCard}
      >
        <LinearGradient
          colors={gradientColors as [string, string]}
          style={styles.anchorCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />

        {/* Icon Container */}
        <View style={[styles.anchorIconContainer, { backgroundColor: `${accentColor}20` }]}>
          <Ionicons name={iconName} size={24} color={accentColor} />
        </View>

        {/* Content */}
        <View style={styles.anchorContent}>
          <Text style={styles.anchorTitle}>{title}</Text>
          {anchor ? (
            <Text style={styles.anchorAddress} numberOfLines={2}>
              {anchor.address || `${anchor.location.lat.toFixed(4)}, ${anchor.location.lng.toFixed(4)}`}
            </Text>
          ) : (
            <Text style={styles.anchorPlaceholder}>Tap to add {title.toLowerCase()} address</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.anchorActions}>
          {anchor && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              style={styles.deleteButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.status.error} />
            </Pressable>
          )}
          <Ionicons
            name={anchor ? 'chevron-forward' : 'add-circle'}
            size={22}
            color={anchor ? Colors.dark.text.tertiary : accentColor}
          />
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
};

/**
 * Address Search Modal Component
 */
const AddressSearchModal: React.FC<{
  visible: boolean;
  type: AnchorType;
  onClose: () => void;
  onSelect: (location: LatLng, address: string) => void;
  currentLocation: LatLng | null;
}> = ({ visible, type, onClose, onSelect, currentLocation }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isUsingCurrentLocation, setIsUsingCurrentLocation] = useState(false);

  const isHome = type === 'home';
  const accentColor = isHome ? Colors.primary.teal : '#6366F1';

  // Clear state when modal closes
  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
    }
  }, [visible]);

  // Debounced address search
  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const geocoded = await Location.geocodeAsync(query);
        const searchResults: SearchResult[] = await Promise.all(
          geocoded.slice(0, 5).map(async (result, index) => {
            const reverseResults = await Location.reverseGeocodeAsync({
              latitude: result.latitude,
              longitude: result.longitude,
            });
            const addr = reverseResults[0];
            const formattedAddress = addr
              ? [addr.streetNumber, addr.street, addr.city, addr.region]
                  .filter(Boolean)
                  .join(', ')
              : `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`;

            return {
              id: `result-${index}`,
              name: addr?.name || formattedAddress.split(',')[0],
              address: formattedAddress,
              location: { lat: result.latitude, lng: result.longitude },
            };
          })
        );
        setResults(searchResults);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleUseCurrentLocation = async () => {
    if (!currentLocation) {
      Alert.alert('Location Unavailable', 'Please enable location services to use your current location.');
      return;
    }

    setIsUsingCurrentLocation(true);
    try {
      const reverseResults = await Location.reverseGeocodeAsync({
        latitude: currentLocation.lat,
        longitude: currentLocation.lng,
      });
      const addr = reverseResults[0];
      const formattedAddress = addr
        ? [addr.streetNumber, addr.street, addr.city, addr.region].filter(Boolean).join(', ')
        : `${currentLocation.lat.toFixed(4)}, ${currentLocation.lng.toFixed(4)}`;

      onSelect(currentLocation, formattedAddress);
    } catch {
      Alert.alert('Error', 'Could not get address for current location.');
    } finally {
      setIsUsingCurrentLocation(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />

      <Animated.View
        entering={SlideInRight.duration(300)}
        style={styles.searchModal}
      >
        <BlurView intensity={40} tint="dark" style={styles.searchModalBlur}>
          <LinearGradient
            colors={['rgba(26, 31, 38, 0.95)', 'rgba(15, 20, 25, 0.98)']}
            style={StyleSheet.absoluteFill}
          />

          {/* Header */}
          <View style={styles.searchModalHeader}>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.dark.text.primary} />
            </Pressable>
            <Text style={styles.searchModalTitle}>
              Set {isHome ? 'Home' : 'Work'} Address
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Search Input */}
          <View style={[styles.searchInputContainer, { borderColor: `${accentColor}40` }]}>
            <Ionicons name="search" size={20} color={Colors.dark.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for an address..."
              placeholderTextColor={Colors.dark.text.tertiary}
              value={query}
              onChangeText={setQuery}
              autoFocus
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={20} color={Colors.dark.text.tertiary} />
              </Pressable>
            )}
          </View>

          {/* Use Current Location Button */}
          <Pressable
            style={({ pressed }) => [
              styles.currentLocationButton,
              { borderColor: accentColor },
              pressed && styles.currentLocationButtonPressed,
            ]}
            onPress={handleUseCurrentLocation}
            disabled={isUsingCurrentLocation}
          >
            {isUsingCurrentLocation ? (
              <ActivityIndicator size="small" color={accentColor} />
            ) : (
              <Ionicons name="locate" size={20} color={accentColor} />
            )}
            <Text style={[styles.currentLocationText, { color: accentColor }]}>
              Use Current Location
            </Text>
          </Pressable>

          {/* Search Results */}
          <ScrollView
            style={styles.searchResults}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isSearching && (
              <View style={styles.searchingContainer}>
                <ActivityIndicator size="small" color={accentColor} />
                <Text style={styles.searchingText}>Searching...</Text>
              </View>
            )}

            {!isSearching && results.length === 0 && query.length >= 3 && (
              <View style={styles.noResultsContainer}>
                <Ionicons name="location-outline" size={48} color={Colors.dark.text.tertiary} />
                <Text style={styles.noResultsText}>No addresses found</Text>
                <Text style={styles.noResultsSubtext}>Try a different search term</Text>
              </View>
            )}

            {results.map((result, index) => (
              <Animated.View key={result.id} entering={FadeIn.delay(index * 50)}>
                <Pressable
                  style={({ pressed }) => [
                    styles.searchResultItem,
                    pressed && styles.searchResultItemPressed,
                  ]}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSelect(result.location, result.address);
                  }}
                >
                  <View style={[styles.resultIconContainer, { backgroundColor: `${accentColor}20` }]}>
                    <Ionicons name="location" size={18} color={accentColor} />
                  </View>
                  <View style={styles.resultContent}>
                    <Text style={styles.resultName} numberOfLines={1}>
                      {result.name}
                    </Text>
                    <Text style={styles.resultAddress} numberOfLines={2}>
                      {result.address}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={18} color={Colors.dark.text.tertiary} />
                </Pressable>
              </Animated.View>
            ))}

            {/* Spacer for keyboard */}
            <View style={{ height: 200 }} />
          </ScrollView>
        </BlurView>
      </Animated.View>
    </View>
  );
};

/**
 * Main Settings Screen
 */
export default function SettingsScreen(): JSX.Element {
  const router = useRouter();
  const { home, work, setAnchor, removeAnchor, isLoading } = useUserAnchors();
  const { currentLocation } = useLocation();

  const [editingType, setEditingType] = useState<AnchorType | null>(null);

  const handleEdit = useCallback((type: AnchorType) => {
    setEditingType(type);
  }, []);

  const handleDelete = useCallback(
    async (type: AnchorType) => {
      Alert.alert(
        `Remove ${type === 'home' ? 'Home' : 'Work'}?`,
        'This will remove the saved address.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeAnchor(type);
            },
          },
        ]
      );
    },
    [removeAnchor]
  );

  const handleSelectAddress = useCallback(
    async (location: LatLng, address: string) => {
      if (!editingType) return;

      await setAnchor(editingType, location, undefined, address);
      setEditingType(null);
    },
    [editingType, setAnchor]
  );

  const locationForSearch: LatLng | null = currentLocation
    ? { lat: currentLocation.lat, lng: currentLocation.lng }
    : null;

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient
          colors={['#0A1A1F', '#0F1419', '#0F1419']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
        />
        <LinearGradient
          colors={['rgba(20, 184, 166, 0.08)', 'transparent']}
          style={styles.headerGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={28} color={Colors.dark.text.primary} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 44 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Saved Places Section */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <Text style={styles.sectionTitle}>Saved Places</Text>
            <Text style={styles.sectionSubtitle}>
              Save your frequent destinations for quick voice commands
            </Text>
          </Animated.View>

          {/* Anchor Cards */}
          <View style={styles.anchorsContainer}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary.teal} />
              </View>
            ) : (
              <>
                <AnchorCard
                  type="home"
                  anchor={home}
                  onEdit={() => handleEdit('home')}
                  onDelete={() => handleDelete('home')}
                  index={0}
                />
                <AnchorCard
                  type="work"
                  anchor={work}
                  onEdit={() => handleEdit('work')}
                  onDelete={() => handleDelete('work')}
                  index={1}
                />
              </>
            )}
          </View>

          {/* Info Card */}
          <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.infoCard}>
            <LinearGradient
              colors={['rgba(20, 184, 166, 0.08)', 'rgba(20, 184, 166, 0.02)']}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.infoIconContainer}>
              <Ionicons name="bulb" size={20} color={Colors.primary.teal} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Voice Tips</Text>
              <Text style={styles.infoText}>
                Once you save your addresses, say things like "Take me home" or "Navigate to work with a coffee stop" and the assistant will know exactly where you mean.
              </Text>
            </View>
          </Animated.View>

          {/* App Info */}
          <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.appInfo}>
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Version</Text>
              <Text style={styles.appInfoValue}>1.0.0</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.appInfoRow}>
              <Text style={styles.appInfoLabel}>Voice Backend</Text>
              <Text style={styles.appInfoValue}>ElevenLabs</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Address Search Modal */}
      <AddressSearchModal
        visible={editingType !== null}
        type={editingType || 'home'}
        onClose={() => setEditingType(null)}
        onSelect={handleSelectAddress}
        currentLocation={locationForSearch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.dark.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['4xl'],
  },
  sectionTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xs,
  },
  sectionSubtitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  anchorsContainer: {
    gap: Spacing.md,
  },
  loadingContainer: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
  },
  anchorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Layout.radiusLarge,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    overflow: 'hidden',
  },
  anchorCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  anchorIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  anchorContent: {
    flex: 1,
  },
  anchorTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginBottom: 4,
  },
  anchorAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    lineHeight: 18,
  },
  anchorPlaceholder: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    fontStyle: 'italic',
  },
  anchorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Layout.radiusLarge,
    padding: Spacing.base,
    marginTop: Spacing['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
    overflow: 'hidden',
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary.tealLight,
    marginBottom: 4,
  },
  infoText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    lineHeight: 20,
  },
  appInfo: {
    marginTop: Spacing['2xl'],
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: Layout.radiusLarge,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  appInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  appInfoLabel: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  appInfoValue: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.secondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: Spacing.base,
  },

  // Modal styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  searchModal: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    maxWidth: 500,
  },
  searchModalBlur: {
    flex: 1,
    overflow: 'hidden',
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: 60,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchModalTitle: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.dark.text.primary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: Layout.radiusLarge,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
    height: 52,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    color: Colors.dark.text.primary,
    paddingVertical: 0,
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(20, 184, 166, 0.08)',
    borderRadius: Layout.radiusLarge,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  currentLocationButtonPressed: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
  },
  currentLocationText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  searchResults: {
    flex: 1,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    gap: Spacing.sm,
  },
  searchingText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  noResultsText: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.base,
    fontWeight: '600',
    color: Colors.dark.text.secondary,
    marginTop: Spacing.md,
  },
  noResultsSubtext: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    color: Colors.dark.text.tertiary,
    marginTop: Spacing.xs,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: Layout.radiusMedium,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  searchResultItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  resultIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  resultContent: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  resultName: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.dark.text.primary,
    marginBottom: 2,
  },
  resultAddress: {
    fontFamily: FontFamily.primary,
    fontSize: FontSize.xs,
    color: Colors.dark.text.tertiary,
    lineHeight: 16,
  },
});
