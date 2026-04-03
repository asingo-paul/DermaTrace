import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Image,
  Modal,
  SafeAreaView,
  Platform,
  Linking,
} from 'react-native';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {api} from '../../lib/api';
import {ProductsStackParamList} from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<ProductsStackParamList, 'AddProduct'>;

// ---------------------------------------------------------------------------
// Camera Modal
// ---------------------------------------------------------------------------

function CameraModal({
  visible,
  onClose,
  onCapture,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (path: string) => void;
}) {
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [capturing, setCapturing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!camera.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await camera.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      onCapture(photo.path);
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setCapturing(false);
    }
  }, [capturing, onCapture, onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={cam.container}>
        {device ? (
          <>
            <Camera
              ref={camera}
              style={cam.preview}
              device={device}
              isActive={visible}
              photo
            />

            {/* Top bar */}
            <View style={cam.topBar}>
              <TouchableOpacity style={cam.closeBtn} onPress={onClose}>
                <Text style={cam.closeBtnText}>✕</Text>
              </TouchableOpacity>
              <Text style={cam.topBarTitle}>Take Product Photo</Text>
              <View style={{width: 40}} />
            </View>

            {/* Capture button */}
            <View style={cam.bottomBar}>
              <Text style={cam.hint}>Point at the product label</Text>
              <TouchableOpacity
                style={[cam.captureBtn, capturing && cam.captureBtnDisabled]}
                onPress={handleCapture}
                disabled={capturing}
                activeOpacity={0.8}>
                {capturing ? (
                  <ActivityIndicator color="#1A6FD4" />
                ) : (
                  <View style={cam.captureInner} />
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={cam.noDevice}>
            <Text style={cam.noDeviceText}>No camera available</Text>
            <TouchableOpacity style={cam.closeBtn} onPress={onClose}>
              <Text style={cam.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const cam = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000000'},
  preview: {flex: 1},
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
    paddingBottom: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  topBarTitle: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '700'},
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  hint: {color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 20},
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  captureBtnDisabled: {opacity: 0.6},
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  noDevice: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20},
  noDeviceText: {color: '#FFFFFF', fontSize: 16},
});

// ---------------------------------------------------------------------------
// AddProductScreen
// ---------------------------------------------------------------------------

export function AddProductScreen({navigation}: Props) {
  const queryClient = useQueryClient();
  const {hasPermission, requestPermission} = useCameraPermission();

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [rawIngredients, setRawIngredients] = useState('');
  const [parsedIngredients, setParsedIngredients] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // No photo — simple JSON post
      if (!photoPath) {
        return api.post('/products', {
          name: name.trim(),
          brand: brand.trim() || null,
          ingredients: parsedIngredients,
        });
      }

      // With photo — multipart form data
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', {
          uri: Platform.OS === 'android' ? `file://${photoPath}` : photoPath,
          type: 'image/jpeg',
          name: `product_${Date.now()}.jpg`,
        } as any);
        formData.append('name', name.trim());
        formData.append('brand', brand.trim() || '');
        formData.append('ingredients', JSON.stringify(parsedIngredients));

        return api.post('/products', formData, {
          headers: {'Content-Type': 'multipart/form-data'},
        });
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: ['products']});
      navigation.goBack();
    },
    onError: (error: any) => {
      if (error?.response?.status === 403) {
        Alert.alert(
          'Free Tier Limit',
          "You've reached the free tier limit. Upgrade to Pro for unlimited products.",
        );
      } else {
        Alert.alert('Error', 'Failed to save product. Please try again.');
      }
    },
  });

  async function handleCameraPress() {
    if (hasPermission) {
      setShowCamera(true);
      return;
    }

    // Request permission
    const granted = await requestPermission();
    if (granted) {
      setShowCamera(true);
    } else {
      Alert.alert(
        'Camera Permission Required',
        'DermaTrace needs camera access to photograph product labels. Please enable it in Settings.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.openSettings();
              }
            },
          },
        ],
      );
    }
  }

  async function handleParse() {
    if (!rawIngredients.trim()) {
      Alert.alert('No ingredients', 'Please enter some ingredients text first.');
      return;
    }
    setIsParsing(true);
    try {
      const res = await api.post<{ingredients: string[]}>('/ingredients/parse', {
        raw: rawIngredients,
      });
      setParsedIngredients(res.data.ingredients);
    } catch {
      Alert.alert('Parse failed', 'Could not parse ingredients. Please try again.');
    } finally {
      setIsParsing(false);
    }
  }

  function handleSave() {
    if (!name.trim()) {
      Alert.alert('Required', 'Product name is required.');
      return;
    }
    saveMutation.mutate();
  }

  const isBusy = saveMutation.isPending || isUploading;

  return (
    <>
      <CameraModal
        visible={showCamera}
        onClose={() => setShowCamera(false)}
        onCapture={path => setPhotoPath(path)}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">

        {/* Photo preview */}
        {photoPath ? (
          <View style={styles.photoContainer}>
            <Image
              source={{uri: `file://${photoPath}`}}
              style={styles.photoPreview}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.photoRemove}
              onPress={() => setPhotoPath(null)}>
              <Text style={styles.photoRemoveText}>✕</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoRetake}
              onPress={handleCameraPress}>
              <Text style={styles.photoRetakeText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.cameraPlaceholder}
            onPress={handleCameraPress}
            activeOpacity={0.7}>
            <View style={styles.cameraIcon}>
              <Text style={styles.cameraIconText}>📷</Text>
            </View>
            <Text style={styles.cameraPlaceholderTitle}>Add Product Photo</Text>
            <Text style={styles.cameraPlaceholderSub}>
              Tap to photograph the product label
            </Text>
          </TouchableOpacity>
        )}

        {/* Name */}
        <Text style={styles.label}>
          Product Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. CeraVe Moisturizing Cream"
          placeholderTextColor="#94A3B8"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        {/* Brand */}
        <Text style={styles.label}>Brand</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. CeraVe"
          placeholderTextColor="#94A3B8"
          value={brand}
          onChangeText={setBrand}
          autoCapitalize="words"
        />

        {/* Ingredients */}
        <Text style={styles.label}>Ingredients</Text>
        <TextInput
          style={[styles.input, styles.ingredientsInput]}
          placeholder="Paste comma-separated ingredients from label..."
          placeholderTextColor="#94A3B8"
          value={rawIngredients}
          onChangeText={setRawIngredients}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <TouchableOpacity
          style={[styles.parseBtn, isParsing && styles.btnDisabled]}
          onPress={handleParse}
          disabled={isParsing}
          activeOpacity={0.7}>
          {isParsing ? (
            <ActivityIndicator size="small" color="#1A6FD4" />
          ) : (
            <Text style={styles.parseBtnText}>Parse Ingredients from Label</Text>
          )}
        </TouchableOpacity>

        {/* Parsed ingredients */}
        {parsedIngredients.length > 0 && (
          <View style={styles.parsedContainer}>
            <View style={styles.parsedHeader}>
              <Text style={styles.parsedLabel}>
                {parsedIngredients.length} ingredients parsed
              </Text>
              <TouchableOpacity onPress={() => setParsedIngredients([])}>
                <Text style={styles.parsedClear}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pillRow}>
              {parsedIngredients.map((ing, i) => (
                <View key={i} style={styles.pill}>
                  <Text style={styles.pillText}>{ing}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, isBusy && styles.btnDisabled]}
          onPress={handleSave}
          disabled={isBusy}
          activeOpacity={0.85}>
          {isBusy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save Product</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#FFFFFF'},
  content: {padding: 20, paddingBottom: 48},

  // Camera placeholder
  cameraPlaceholder: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#F8FAFC',
  },
  cameraIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cameraIconText: {fontSize: 24},
  cameraPlaceholderTitle: {fontSize: 15, fontWeight: '600', color: '#0F172A', marginBottom: 4},
  cameraPlaceholderSub: {fontSize: 13, color: '#64748B'},

  // Photo preview
  photoContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 24,
    position: 'relative',
  },
  photoPreview: {width: '100%', height: 200, borderRadius: 14},
  photoRemove: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {color: '#FFFFFF', fontSize: 14, fontWeight: '700'},
  photoRetake: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  photoRetakeText: {color: '#FFFFFF', fontSize: 13, fontWeight: '600'},

  label: {fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8},
  required: {color: '#EF4444'},
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
  ingredientsInput: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  parseBtn: {
    borderWidth: 1.5,
    borderColor: '#1A6FD4',
    borderRadius: 10,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  parseBtnText: {color: '#1A6FD4', fontSize: 14, fontWeight: '600'},

  parsedContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  parsedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  parsedLabel: {fontSize: 13, fontWeight: '600', color: '#64748B'},
  parsedClear: {fontSize: 13, color: '#EF4444', fontWeight: '500'},
  pillRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  pill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  pillText: {color: '#1A6FD4', fontSize: 12, fontWeight: '500'},

  saveBtn: {
    backgroundColor: '#1A6FD4',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {opacity: 0.5},
  saveBtnText: {color: '#FFFFFF', fontSize: 16, fontWeight: '600'},
});
