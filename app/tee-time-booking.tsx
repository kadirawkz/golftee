import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AnimatedPressable as Pressable } from "../components/animated-pressable";
import { AppImage } from "../components/app-image";
import { isEditableBooking, useBookingState } from "../services/bookings";
import { getColomboDateKey, parseDateKeyToDate } from "../utils/colombo-time";
import { getAvailableTeeSlots, getManagedCourseById, getNextBookableTeeSlot, type TeeSlot, useCourseCatalog } from "../services/course-management";
import { useResponsiveLayout } from "../hooks/useResponsiveLayout";
import { createThemedStyleSheet, useThemedStyles, useAppTheme, theme } from "../components/theme";
import { DailyWeatherForecast, getFourteenDayForecast, getWeatherCodeIconName } from "../services/weather";
import { getCourseImage } from "../lib/image-mapping";

const SERVICE_FEE = 12.5;
const CADDY_FEE_PER_PLAYER = 7.5;
const DATE_CHIP_WIDTH = 62;
const DATE_CHIP_GAP = 10;
const WEATHER_CARD_WIDTH = 78;
const WEATHER_CARD_GAP = 10;

type TimePeriod = "MORNING" | "AFTERNOON";

function toDayStart(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dateKey(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${value.getFullYear()}-${month}-${day}`;
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function compareTeeSlots(a: TeeSlot, b: TeeSlot) {
  return parseTimeToMinutes(a.teeTime) - parseTimeToMinutes(b.teeTime);
}

function formatTeeTimeLabel(value: string) {
  if (!value) {
    return "Time not selected";
  }

  const [hoursValue, minutesValue] = value.split(":").map(Number);
  if (Number.isNaN(hoursValue) || Number.isNaN(minutesValue)) {
    return value;
  }

  const period = hoursValue >= 12 ? "PM" : "AM";
  const normalizedHours = hoursValue % 12 || 12;
  const paddedMinutes = String(minutesValue).padStart(2, "0");
  return `${normalizedHours}:${paddedMinutes} ${period}`;
}

export default function TeeTimeBookingScreen() {
  const { colors, resolvedTheme } = useAppTheme();
  const styles = useThemedStyles(themedStyles);
  const router = useRouter();
  const { horizontalPadding, screenBottomPadding, isTabletLike } = useResponsiveLayout();
  const { id, courseId: paramCourseId, bookingId } = useLocalSearchParams<{
    id?: string | string[];
    courseId?: string | string[];
    bookingId?: string | string[];
  }>();
  const rawCourseId = id || paramCourseId;
  const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;
  const resolvedBookingId = Array.isArray(bookingId) ? bookingId[0] : bookingId;
  useCourseCatalog();
  const course = getManagedCourseById(courseId);
  const bookingState = useBookingState();
  const existingBooking = bookingState.bookings.find((item) => item.id === resolvedBookingId) ?? null;
  const canEditExistingBooking = existingBooking ? isEditableBooking(existingBooking) : true;
  const [weather, setWeather] = useState<DailyWeatherForecast[]>([]);
  const [weatherState, setWeatherState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [slotState, setSlotState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [slotError, setSlotError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TeeSlot[]>([]);
  const [now, setNow] = useState(() => new Date());

  const [stripStartDate, setStripStartDate] = useState<Date>(() => parseDateKeyToDate(getColomboDateKey()));
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => getColomboDateKey());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState(1);

  // Load default player preference from App Settings
  useEffect(() => {
    const loadDefaultPlayers = async () => {
      try {
        const val = await AsyncStorage.getItem("golftee:settings:default_players");
        if (val && !existingBooking) {
          const count = parseInt(val, 10);
          if (count >= 1 && count <= 4) {
            setSelectedPlayers(count);
          }
        }
      } catch (err) {
        console.warn("Failed to load default players", err);
      }
    };
    loadDefaultPlayers();
  }, [existingBooking]);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("MORNING");
  const [selectedTime, setSelectedTime] = useState("08:00");
  const [todayHasBookableSlots, setTodayHasBookableSlots] = useState(true);
  const [autoSelectionLoading, setAutoSelectionLoading] = useState(false);
  const weatherStripRef = useRef<ScrollView>(null);
  const dateStripRef = useRef<ScrollView>(null);

  const bookingDates = useMemo(() => {
    return Array.from({ length: 64 }, (_, index) => {
      const date = new Date(stripStartDate);
      date.setDate(stripStartDate.getDate() + index);
      return {
        key: dateKey(date),
        day: date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
        date: date.getDate(),
        fullDate: date,
      };
    });
  }, [stripStartDate]);

  const selectedDateObj = useMemo(() => {
    const selectedDate = bookingDates.find((item) => item.key === selectedDateKey);
    if (selectedDate) {
      return selectedDate;
    }

    const fallbackDate = parseDateKeyToDate(selectedDateKey);
    return {
      key: selectedDateKey,
      day: fallbackDate.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      date: fallbackDate.getDate(),
      fullDate: fallbackDate,
    };
  }, [bookingDates, selectedDateKey]);
  const todayDateKey = getColomboDateKey(now);
  const visibleBookingDates = useMemo(() => {
    return bookingDates.filter((item) => {
      if (item.key !== todayDateKey) {
        return true;
      }

      return todayHasBookableSlots || existingBooking?.tee_date === todayDateKey;
    });
  }, [bookingDates, existingBooking?.tee_date, todayDateKey, todayHasBookableSlots]);
  const minimumBookableDateKey = useMemo(() => {
    if (todayHasBookableSlots || existingBooking?.tee_date === todayDateKey) {
      return todayDateKey;
    }

    const tomorrow = parseDateKeyToDate(todayDateKey);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateKey(tomorrow);
  }, [existingBooking?.tee_date, todayDateKey, todayHasBookableSlots]);
  const minimumBookableDate = useMemo(() => {
    return parseDateKeyToDate(minimumBookableDateKey);
  }, [minimumBookableDateKey]);
  const basePrice = Number(course.price.replace(/[^0-9.]/g, "")) || 0;
  const greenFees = basePrice * selectedPlayers;
  const serviceFee = SERVICE_FEE;
  const caddyFee = Number((selectedPlayers * CADDY_FEE_PER_PLAYER).toFixed(2));
  const taxesAndFees = Number((greenFees * 0.0845).toFixed(2));
  const totalDue = Number((greenFees + serviceFee + caddyFee + taxesAndFees).toFixed(2));

  const monthYearLabel = selectedDateObj.fullDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }).toUpperCase();

  const formattedBookingDate = selectedDateObj.fullDate.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });

  const formattedDateTime = useMemo(() => {
    if (!selectedTime) {
      return `${selectedDateObj.day}, ${formattedBookingDate} - Time not selected`;
    }

    return `${selectedDateObj.day}, ${formattedBookingDate} - ${formatTeeTimeLabel(selectedTime)}`;
  }, [formattedBookingDate, selectedDateObj.day, selectedTime]);
  const visibleWeather = useMemo(() => {
    return weather.filter((day) => {
      if (day.dateKey !== todayDateKey) {
        return true;
      }

      return todayHasBookableSlots || existingBooking?.tee_date === todayDateKey;
    });
  }, [existingBooking?.tee_date, todayDateKey, todayHasBookableSlots, weather]);
  const periodSlots = useMemo(() => {
    return availableSlots
      .filter((slot) => slot.timePeriod === timePeriod)
      .map((slot) => {
        const isExistingBookingSlot =
          canEditExistingBooking &&
          existingBooking?.tee_date === selectedDateObj.key &&
          existingBooking?.tee_time.slice(0, 5) === slot.teeTime &&
          existingBooking?.time_period === slot.timePeriod;
        const isAvailable = slot.isAvailable || isExistingBookingSlot;
        const isPast = slot.isPast && !isExistingBookingSlot;
        const isSelectable = isAvailable && !isPast;

        return {
          ...slot,
          isAvailable,
          isPast,
          isSelectable,
          isUnavailableByBooking: !slot.isAvailable && !isExistingBookingSlot,
        };
      });
  }, [availableSlots, canEditExistingBooking, existingBooking, selectedDateObj.key, timePeriod]);
  const visiblePeriodSlots = useMemo(
    () => periodSlots,
    [periodSlots],
  );
  const firstSelectableSlotForPeriod = useMemo(
    () => visiblePeriodSlots.find((slot) => slot.isSelectable) ?? null,
    [visiblePeriodSlots],
  );
  const selectableSlotsForSelectedDate = useMemo(() => {
    return availableSlots
      .map((slot) => {
        const isExistingBookingSlot =
          canEditExistingBooking &&
          existingBooking?.tee_date === selectedDateObj.key &&
          existingBooking?.tee_time.slice(0, 5) === slot.teeTime &&
          existingBooking?.time_period === slot.timePeriod;
        const isAvailable = slot.isAvailable || isExistingBookingSlot;
        const isPast = slot.isPast && !isExistingBookingSlot;

        return {
          ...slot,
          isAvailable,
          isSelectable: isAvailable && !isPast,
        };
      })
      .filter((slot) => slot.isSelectable)
      .sort(compareTeeSlots);
  }, [availableSlots, canEditExistingBooking, existingBooking, selectedDateObj.key]);
  const availableTimes = useMemo(
    () => visiblePeriodSlots.filter((slot) => slot.isSelectable).map((slot) => slot.teeTime),
    [visiblePeriodSlots],
  );

  useEffect(() => {
    if (!existingBooking) {
      return;
    }

    const bookingDate = toDayStart(new Date(`${existingBooking.tee_date}T00:00:00`));

    setStripStartDate(bookingDate);
    setSelectedDateKey(dateKey(bookingDate));
    setSelectedPlayers(existingBooking.players);
    setTimePeriod(existingBooking.time_period as TimePeriod);
    setSelectedTime(existingBooking.tee_time.slice(0, 5));
  }, [existingBooking]);

  useEffect(() => {
    if (existingBooking) {
      return;
    }

    const initialDate = parseDateKeyToDate(getColomboDateKey());
    setStripStartDate(initialDate);
    setSelectedDateKey(dateKey(initialDate));
    setTimePeriod("MORNING");
    setSelectedTime("");
  }, [course.id, existingBooking]);

  useEffect(() => {
    if (existingBooking) {
      return;
    }

    if (dateKey(stripStartDate) < minimumBookableDateKey) {
      setStripStartDate(minimumBookableDate);
    }
  }, [existingBooking, minimumBookableDate, minimumBookableDateKey, stripStartDate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (existingBooking) {
      setTodayHasBookableSlots(existingBooking.tee_date === todayDateKey);
      return;
    }

    let active = true;

    const loadClosestBookableSlot = async () => {
      setAutoSelectionLoading(true);

      try {
        const nextSlot = await getNextBookableTeeSlot(course.id);
        if (!active) {
          return;
        }

        setTodayHasBookableSlots(nextSlot?.teeDate === todayDateKey);

        if (nextSlot) {
          setSelectedDateKey(nextSlot.teeDate);
          setTimePeriod(nextSlot.timePeriod);
          setSelectedTime(nextSlot.teeTime);
        } else {
          setSelectedTime("");
        }
      } catch {
        if (!active) {
          return;
        }

        setTodayHasBookableSlots(true);
      } finally {
        if (active) {
          setAutoSelectionLoading(false);
        }
      }
    };

    void loadClosestBookableSlot();

    return () => {
      active = false;
    };
  }, [course.id, existingBooking, todayDateKey]);

  useEffect(() => {
    if (existingBooking) {
      setTodayHasBookableSlots(existingBooking.tee_date === todayDateKey);
      return;
    }

    let active = true;

    const refreshTodayAvailability = async () => {
      try {
        const nextSlot = await getNextBookableTeeSlot(course.id);
        if (!active) {
          return;
        }

        setTodayHasBookableSlots(nextSlot?.teeDate === todayDateKey);
      } catch {
        if (!active) {
          return;
        }

        setTodayHasBookableSlots(true);
      }
    };

    void refreshTodayAvailability();

    return () => {
      active = false;
    };
  }, [course.id, existingBooking, now, todayDateKey]);

  useEffect(() => {
    let active = true;

    const loadSlots = async () => {
      setSlotState("loading");
      setSlotError(null);

      try {
        const slots = await getAvailableTeeSlots(course.id, selectedDateObj.key);
        if (!active) {
          return;
        }

        setAvailableSlots(slots);
        setSlotState("success");
      } catch (error) {
        if (!active) {
          return;
        }

        setAvailableSlots([]);
        setSlotState("error");
        setSlotError(error instanceof Error ? error.message : "Unable to load tee slots right now.");
      }
    };

    void loadSlots();

    return () => {
      active = false;
    };
  }, [course.id, selectedDateObj.key]);

  useEffect(() => {
    if (existingBooking || slotState !== "success" || !canEditExistingBooking) {
      return;
    }

    if (!selectableSlotsForSelectedDate.length) {
      let active = true;

      const loadClosestSlotFromSelectedDate = async () => {
        try {
          const nextSlot = await getNextBookableTeeSlot(course.id, selectedDateObj.key);
          if (!active) {
            return;
          }

          if (!nextSlot) {
            setSelectedTime("");
            return;
          }

          setSelectedDateKey(nextSlot.teeDate);
          setTimePeriod(nextSlot.timePeriod);
          setSelectedTime(nextSlot.teeTime);
        } catch {
          if (!active) {
            return;
          }

          setSelectedTime("");
        }
      };

      void loadClosestSlotFromSelectedDate();

      return () => {
        active = false;
      };
    }

    const selectedSlot = selectableSlotsForSelectedDate.find(
      (slot) => slot.teeTime === selectedTime && slot.timePeriod === timePeriod,
    );
    if (!selectedSlot) {
      if (firstSelectableSlotForPeriod) {
        setSelectedTime(firstSelectableSlotForPeriod.teeTime);
        return;
      }

      setSelectedTime("");
      return;
    }
  }, [
    course.id,
    canEditExistingBooking,
    existingBooking,
    firstSelectableSlotForPeriod,
    selectedDateObj.key,
    selectableSlotsForSelectedDate,
    selectedTime,
    slotState,
    timePeriod,
  ]);

  useEffect(() => {
    if (!availableTimes.length) {
      setSelectedTime("");
      return;
    }

    if (selectedTime && !availableTimes.includes(selectedTime)) {
      setSelectedTime("");
    }
  }, [availableTimes, selectedTime]);

  useEffect(() => {
    const selectedDateIndex = visibleBookingDates.findIndex((item) => item.key === selectedDateKey);
    if (selectedDateIndex < 0) {
      return;
    }

    dateStripRef.current?.scrollTo({
      x: Math.max(0, selectedDateIndex * (DATE_CHIP_WIDTH + DATE_CHIP_GAP) - DATE_CHIP_WIDTH),
      animated: true,
    });
  }, [selectedDateKey, visibleBookingDates]);

  useEffect(() => {
    const selectedWeatherIndex = visibleWeather.findIndex((item) => item.dateKey === selectedDateKey);
    if (selectedWeatherIndex < 0) {
      return;
    }

    weatherStripRef.current?.scrollTo({
      x: Math.max(0, selectedWeatherIndex * (WEATHER_CARD_WIDTH + WEATHER_CARD_GAP) - WEATHER_CARD_WIDTH),
      animated: true,
    });
  }, [selectedDateKey, visibleWeather]);

  useEffect(() => {
    let active = true;
    const interactionTask = InteractionManager.runAfterInteractions(() => {
      const loadWeather = async () => {
        setWeatherState("loading");

        try {
          const forecast = await getFourteenDayForecast(course.coordinates);
          if (!active) {
            return;
          }

          setWeather(forecast);
          setWeatherState("success");
        } catch {
          if (!active) {
            return;
          }

          setWeatherState("error");
        }
      };

      void loadWeather();
    });

    return () => {
      active = false;
      interactionTask.cancel();
    };
  }, [course.coordinates, course.id]);

  const applySelectedDate = (pickedDate: Date) => {
    const normalized = toDayStart(pickedDate);
    const pickedDateKey = dateKey(normalized);

    if (!bookingDates.some((item) => item.key === pickedDateKey)) {
      setStripStartDate(normalized);
    }

    setSelectedDateKey(pickedDateKey);
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, pickedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (event.type === "set" && pickedDate) {
        applySelectedDate(pickedDate);
      }
      return;
    }

    if (pickedDate) {
      applySelectedDate(pickedDate);
    }
  };

  const handleCalendarQuickPick = () => {
    setShowDatePicker((current) => !current);
  };

  const handleConfirmBooking = () => {
    if (!selectedTime || !canEditExistingBooking) {
      return;
    }

    router.navigate({
      pathname: "/booking-checkout",
      params: {
        id: course.id,
        players: String(selectedPlayers),
        date: formattedBookingDate,
        day: selectedDateObj.day,
        time: selectedTime,
        period: timePeriod,
        dateKey: selectedDateObj.key,
        bookingId: resolvedBookingId,
        subtotal: greenFees.toFixed(2),
        serviceFee: serviceFee.toFixed(2),
        caddyFee: caddyFee.toFixed(2),
        taxes: taxesAndFees.toFixed(2),
        total: totalDue.toFixed(2),
      },
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <StatusBar style={resolvedTheme === "dark" ? "light" : "dark"} />
      <ScrollView
        showsVerticalScrollIndicator={Platform.OS === "web"}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: horizontalPadding, paddingBottom: screenBottomPadding },
        ]}
        bounces={false}
        overScrollMode="never"
      >
        {isTabletLike ? (
          <View style={styles.desktopLayoutRow}>
            <View style={styles.desktopColumnLeft}>
              {/* 14-Day Weather */}
              <View style={[styles.section, { marginTop: 0 }]}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>14-Day Weather</Text>
                  <Text style={styles.sectionMeta}>Forecast</Text>
                </View>

                {weatherState === "loading" || autoSelectionLoading ? (
                  <Text style={styles.weatherStateText}>Loading weather forecast...</Text>
                ) : null}

                {weatherState === "error" ? (
                  <Text style={styles.weatherStateText}>Weather forecast is unavailable right now.</Text>
                ) : null}

                {weatherState === "success" ? (
                  <ScrollView
                    ref={weatherStripRef}
                    horizontal
                    showsHorizontalScrollIndicator={Platform.OS === "web"}
                    contentContainerStyle={styles.weatherRow}
                    bounces={false}
                    overScrollMode="never"
                  >
                    {visibleWeather.map((day) => {
                      const active = day.dateKey === selectedDateObj.key;
                      return (
                      <View key={day.dateKey} style={[styles.weatherCard, active && styles.weatherCardActive]}>
                        <Text style={styles.weatherDate}>{day.dateLabel}</Text>
                        <View style={styles.weatherIconWrap}>
                          <Ionicons
                            name={getWeatherCodeIconName(day.weatherCode)}
                            size={20}
                            color={colors.accentWarm}
                          />
                        </View>
                        <Text style={styles.weatherTemp}>{`${day.tempMax}\u00B0`}</Text>
                        <Text style={styles.weatherMinTemp}>{`${day.tempMin}\u00B0 low`}</Text>
                      </View>
                      );
                    })}
                  </ScrollView>
                ) : null}
              </View>

              {/* Select Date */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Select Date</Text>
                  <View style={styles.sectionHeaderRight}>
                    <Text style={styles.sectionMeta}>{monthYearLabel}</Text>
                    <Pressable
                      style={[styles.calendarQuickButton]}
                      onPress={handleCalendarQuickPick}
                      disabled={!canEditExistingBooking}
                      variant="chip"
                    >
                      <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                      <Text style={styles.calendarQuickButtonText}>Calendar</Text>
                    </Pressable>
                  </View>
                </View>

                {showDatePicker && canEditExistingBooking ? (
                  <View style={styles.inlinePickerWrap}>
                    <DateTimePicker
                      value={selectedDateObj.fullDate}
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      minimumDate={minimumBookableDate}
                      onChange={handleDatePickerChange}
                    />
                    <Pressable style={[styles.inlinePickerDoneButton]} onPress={() => setShowDatePicker(false)} variant="button">
                      <Text style={styles.inlinePickerDoneButtonText}>Done</Text>
                    </Pressable>
                  </View>
                ) : null}

                <ScrollView
                  ref={dateStripRef}
                  horizontal
                  showsHorizontalScrollIndicator={Platform.OS === "web"}
                  contentContainerStyle={styles.dateRow}
                  bounces={false}
                  overScrollMode="never"
                >
                  {visibleBookingDates.map((item) => {
                    const active = item.key === selectedDateKey;
                    return (
                      <Pressable
                        key={item.key}
                        style={[styles.dateChip, active && styles.dateChipActive]}
                        onPress={() => {
                          if (canEditExistingBooking) {
                            setSelectedDateKey(item.key);
                          }
                        }}
                        disabled={!canEditExistingBooking}
                        variant="chip"
                      >
                        <Text style={[styles.dateChipDay, active && styles.dateChipDayActive]}>{item.day}</Text>
                        <Text style={[styles.dateChipDate, active && styles.dateChipDateActive]}>{item.date}</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Number of Players */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Number of Players</Text>
                <View style={styles.playersRow}>
                  {[1, 2, 3, 4].map((count) => {
                    const active = selectedPlayers === count;
                    const iconName = count === 1 ? "person" : count === 2 ? "people" : "people-circle";

                    return (
                      <Pressable
                        key={count}
                        style={[styles.playerChip, active && styles.playerChipActive]}
                        onPress={() => {
                          if (canEditExistingBooking) {
                            setSelectedPlayers(count);
                          }
                        }}
                        disabled={!canEditExistingBooking}
                        variant="chip"
                      >
                        <Ionicons
                          name={iconName as "person" | "people" | "people-circle"}
                          size={16}
                          color={active ? colors.accentWarm : colors.text}
                        />
                        <Text style={[styles.playerChipText, active && styles.playerChipTextActive]}>{count}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Available Times */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Available Times</Text>
                  <View style={styles.periodRow}>
                    <Pressable
                      style={[styles.periodPill, timePeriod === "MORNING" && styles.periodPillActive]}
                      onPress={() => {
                        if (canEditExistingBooking) {
                          setTimePeriod("MORNING");
                          setSelectedTime("");
                        }
                      }}
                      disabled={!canEditExistingBooking}
                      variant="chip"
                    >
                      <Text style={[styles.periodText, timePeriod === "MORNING" && styles.periodTextActive]}>MORNING</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.periodPill, timePeriod === "AFTERNOON" && styles.periodPillActive]}
                      onPress={() => {
                        if (canEditExistingBooking) {
                          setTimePeriod("AFTERNOON");
                          setSelectedTime("");
                        }
                      }}
                      disabled={!canEditExistingBooking}
                      variant="chip"
                    >
                      <Text style={[styles.periodText, timePeriod === "AFTERNOON" && styles.periodTextActive]}>
                        AFTERNOON
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.timeGrid}>
                  {slotState === "loading" ? <Text style={styles.weatherStateText}>Loading available tee slots...</Text> : null}
                  {slotState === "error" ? <Text style={styles.weatherStateText}>{slotError}</Text> : null}
                  {slotState === "success" && !visiblePeriodSlots.length ? (
                    <Text style={styles.weatherStateText}>No tee slots configured for this period on the selected date.</Text>
                  ) : null}
                  {slotState === "success" && visiblePeriodSlots.length > 0 && !availableTimes.length ? (
                    <Text style={styles.weatherStateText}>Past and booked tee times are shown below. No bookable slots remain in this period.</Text>
                  ) : null}
                  {slotState === "success" && visiblePeriodSlots.map((slot) => {
                    const active = selectedTime === slot.teeTime;
                    const disabled = !slot.isSelectable;
                    return (
                      <Pressable
                        key={slot.teeTime}
                        style={[
                          styles.timeChip,
                          active && styles.timeChipActive,
                          slot.isPast && styles.timeChipPast,
                          slot.isUnavailableByBooking && styles.timeChipBooked,
                        ]}
                        onPress={() => {
                          if (!disabled) {
                            setSelectedTime(slot.teeTime);
                          }
                        }}
                        disabled={disabled || !canEditExistingBooking}
                        variant="chip"
                      >
                        <Text
                          style={[
                            styles.timeChipText,
                            active && styles.timeChipTextActive,
                            disabled && styles.timeChipTextDisabled,
                            slot.isUnavailableByBooking && styles.timeChipTextBooked,
                          ]}
                        >
                          {slot.teeTime}
                        </Text>
                        {slot.isUnavailableByBooking ? <View style={styles.timeChipStrike} /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={styles.desktopColumnRight}>
              {/* Hero Section */}
              <View style={[styles.heroSection, { height: 180 }]}>
                <AppImage source={getCourseImage(course.image)} style={styles.heroImage} />
                <View style={styles.heroOverlay} />

                <View style={styles.heroContent}>
                  <Text style={styles.heroTitle}>{course.title}</Text>
                  <View style={styles.heroLocationRow}>
                    <Ionicons name="location" size={14} color="rgba(255, 255, 255, 0.8)" />
                    <Text style={styles.heroLocation}>{course.location}</Text>
                  </View>
                </View>
              </View>

              {/* Summary Card */}
              <View style={[styles.summaryCard, { marginTop: 0 }]}>
                <Text style={styles.summaryTitle}>Booking Summary</Text>

                {!canEditExistingBooking && existingBooking ? (
                  <Text style={styles.weatherStateText}>This booking is read-only because its tee time has already passed.</Text>
                ) : null}

                <View style={styles.summaryMetaItem}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="calendar" size={18} color={colors.accentSoft} />
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>DATE & TIME</Text>
                    <Text style={styles.summaryValue}>{formattedDateTime}</Text>
                  </View>
                </View>

                <View style={styles.summaryMetaItem}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="person" size={18} color={colors.accentSoft} />
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>PARTY SIZE</Text>
                    <Text style={styles.summaryValue}>{selectedPlayers} Players</Text>
                  </View>
                </View>

                <View style={styles.pricingSection}>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingName}>Green Fees ({selectedPlayers}x)</Text>
                    <Text style={styles.pricingAmount}>${greenFees.toFixed(2)}</Text>
                  </View>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingName}>Service Fee</Text>
                    <Text style={styles.pricingAmount}>${serviceFee.toFixed(2)}</Text>
                  </View>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingName}>Caddy Fee</Text>
                    <Text style={styles.pricingAmount}>${caddyFee.toFixed(2)}</Text>
                  </View>
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingName}>Taxes & Fees</Text>
                    <Text style={styles.pricingAmount}>${taxesAndFees.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.pricingRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total Due</Text>
                    <Text style={styles.totalAmount}>${totalDue.toFixed(2)}</Text>
                  </View>
                </View>

                <Pressable
                  style={[styles.confirmButton, (!selectedTime || !canEditExistingBooking) && styles.confirmButtonDisabled]}
                  onPress={handleConfirmBooking}
                  disabled={!selectedTime || !canEditExistingBooking}
                  variant="cta"
                >
                  <Text style={styles.confirmButtonText}>{existingBooking ? "Save Changes" : "Confirm Booking"}</Text>
                </Pressable>

                <Text style={styles.policyText}>
                  By confirming, you agree to our 24-hour cancellation policy and course etiquette guidelines.
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.heroSection}>
              <AppImage source={getCourseImage(course.image)} style={styles.heroImage} />
              <View style={styles.heroOverlay} />

              <View style={styles.heroContent}>
                <Text style={styles.heroTitle}>{course.title}</Text>

                <View style={styles.heroLocationRow}>
                  <Ionicons name="location" size={14} color="rgba(255, 255, 255, 0.8)" />
                  <Text style={styles.heroLocation}>{course.location}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>14-Day Weather</Text>
                <Text style={styles.sectionMeta}>Forecast</Text>
              </View>

              {weatherState === "loading" || autoSelectionLoading ? (
                <Text style={styles.weatherStateText}>Loading weather forecast...</Text>
              ) : null}

              {weatherState === "error" ? (
                <Text style={styles.weatherStateText}>Weather forecast is unavailable right now.</Text>
              ) : null}

              {weatherState === "success" ? (
                <ScrollView
                  ref={weatherStripRef}
                  horizontal
                  showsHorizontalScrollIndicator={Platform.OS === "web"}
                  contentContainerStyle={styles.weatherRow}
                  bounces={false}
                  overScrollMode="never"
                >
                  {visibleWeather.map((day) => {
                    const active = day.dateKey === selectedDateObj.key;
                    return (
                    <View key={day.dateKey} style={[styles.weatherCard, active && styles.weatherCardActive]}>
                      <Text style={styles.weatherDate}>{day.dateLabel}</Text>
                      <View style={styles.weatherIconWrap}>
                        <Ionicons
                          name={getWeatherCodeIconName(day.weatherCode)}
                          size={20}
                          color={colors.accentWarm}
                        />
                      </View>
                      <Text style={styles.weatherTemp}>{`${day.tempMax}\u00B0`}</Text>
                      <Text style={styles.weatherMinTemp}>{`${day.tempMin}\u00B0 low`}</Text>
                    </View>
                    );
                  })}
                </ScrollView>
              ) : null}

            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Date</Text>
                <View style={styles.sectionHeaderRight}>
                  <Text style={styles.sectionMeta}>{monthYearLabel}</Text>
                  <Pressable
                    style={[styles.calendarQuickButton]}
                    onPress={handleCalendarQuickPick}
                    disabled={!canEditExistingBooking}
                    variant="chip"
                  >
                    <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                    <Text style={styles.calendarQuickButtonText}>Calendar</Text>
                  </Pressable>
                </View>
              </View>

              {showDatePicker && canEditExistingBooking ? (
                <View style={styles.inlinePickerWrap}>
                  <DateTimePicker
                    value={selectedDateObj.fullDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    minimumDate={minimumBookableDate}
                    onChange={handleDatePickerChange}
                  />
                  <Pressable style={[styles.inlinePickerDoneButton]} onPress={() => setShowDatePicker(false)} variant="button">
                    <Text style={styles.inlinePickerDoneButtonText}>Done</Text>
                  </Pressable>
                </View>
              ) : null}

                <ScrollView
                  ref={dateStripRef}
                  horizontal
                  showsHorizontalScrollIndicator={Platform.OS === "web"}
                  contentContainerStyle={styles.dateRow}
                bounces={false}
                overScrollMode="never"
              >
                {visibleBookingDates.map((item) => {
                  const active = item.key === selectedDateKey;
                  return (
                    <Pressable
                      key={item.key}
                      style={[styles.dateChip, active && styles.dateChipActive]}
                      onPress={() => {
                        if (canEditExistingBooking) {
                          setSelectedDateKey(item.key);
                        }
                      }}
                      disabled={!canEditExistingBooking}
                      variant="chip"
                    >
                      <Text style={[styles.dateChipDay, active && styles.dateChipDayActive]}>{item.day}</Text>
                      <Text style={[styles.dateChipDate, active && styles.dateChipDateActive]}>{item.date}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Number of Players</Text>
              <View style={styles.playersRow}>
                {[1, 2, 3, 4].map((count) => {
                  const active = selectedPlayers === count;
                  const iconName = count === 1 ? "person" : count === 2 ? "people" : "people-circle";

                  return (
                    <Pressable
                      key={count}
                      style={[styles.playerChip, active && styles.playerChipActive]}
                      onPress={() => {
                        if (canEditExistingBooking) {
                          setSelectedPlayers(count);
                        }
                      }}
                      disabled={!canEditExistingBooking}
                      variant="chip"
                    >
                      <Ionicons
                        name={iconName as "person" | "people" | "people-circle"}
                        size={16}
                        color={active ? colors.accentWarm : colors.text}
                      />
                      <Text style={[styles.playerChipText, active && styles.playerChipTextActive]}>{count}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Available Times</Text>
                <View style={styles.periodRow}>
                  <Pressable
                    style={[styles.periodPill, timePeriod === "MORNING" && styles.periodPillActive]}
                    onPress={() => {
                      if (canEditExistingBooking) {
                        setTimePeriod("MORNING");
                        setSelectedTime("");
                      }
                    }}
                    disabled={!canEditExistingBooking}
                    variant="chip"
                  >
                    <Text style={[styles.periodText, timePeriod === "MORNING" && styles.periodTextActive]}>MORNING</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.periodPill, timePeriod === "AFTERNOON" && styles.periodPillActive]}
                    onPress={() => {
                      if (canEditExistingBooking) {
                        setTimePeriod("AFTERNOON");
                        setSelectedTime("");
                      }
                    }}
                    disabled={!canEditExistingBooking}
                    variant="chip"
                  >
                    <Text style={[styles.periodText, timePeriod === "AFTERNOON" && styles.periodTextActive]}>
                      AFTERNOON
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.timeGrid}>
                {slotState === "loading" ? <Text style={styles.weatherStateText}>Loading available tee slots...</Text> : null}
                {slotState === "error" ? <Text style={styles.weatherStateText}>{slotError}</Text> : null}
                {slotState === "success" && !visiblePeriodSlots.length ? (
                  <Text style={styles.weatherStateText}>No tee slots configured for this period on the selected date.</Text>
                ) : null}
                {slotState === "success" && visiblePeriodSlots.length > 0 && !availableTimes.length ? (
                  <Text style={styles.weatherStateText}>Past and booked tee times are shown below. No bookable slots remain in this period.</Text>
                ) : null}
                {slotState === "success" && visiblePeriodSlots.map((slot) => {
                  const active = selectedTime === slot.teeTime;
                  const disabled = !slot.isSelectable;
                  return (
                    <Pressable
                      key={slot.teeTime}
                      style={[
                        styles.timeChip,
                        active && styles.timeChipActive,
                        slot.isPast && styles.timeChipPast,
                        slot.isUnavailableByBooking && styles.timeChipBooked,
                      ]}
                      onPress={() => {
                        if (!disabled) {
                          setSelectedTime(slot.teeTime);
                        }
                      }}
                      disabled={disabled || !canEditExistingBooking}
                      variant="chip"
                    >
                      <Text
                        style={[
                          styles.timeChipText,
                          active && styles.timeChipTextActive,
                          disabled && styles.timeChipTextDisabled,
                          slot.isUnavailableByBooking && styles.timeChipTextBooked,
                        ]}
                      >
                        {slot.teeTime}
                      </Text>
                      {slot.isUnavailableByBooking ? <View style={styles.timeChipStrike} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Booking Summary</Text>

                {!canEditExistingBooking && existingBooking ? (
                  <Text style={styles.weatherStateText}>This booking is read-only because its tee time has already passed.</Text>
                ) : null}

                <View style={styles.summaryMetaItem}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="calendar" size={18} color={colors.accentSoft} />
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>DATE & TIME</Text>
                    <Text style={styles.summaryValue}>{formattedDateTime}</Text>
                  </View>
                </View>

                <View style={styles.summaryMetaItem}>
                  <View style={styles.summaryIconWrap}>
                    <Ionicons name="person" size={18} color={colors.accentSoft} />
                  </View>
                  <View>
                    <Text style={styles.summaryLabel}>PARTY SIZE</Text>
                    <Text style={styles.summaryValue}>{selectedPlayers} Players</Text>
                  </View>
                </View>

                <View style={styles.pricingSection}>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingName}>Green Fees ({selectedPlayers}x)</Text>
                  <Text style={styles.pricingAmount}>${greenFees.toFixed(2)}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingName}>Service Fee</Text>
                  <Text style={styles.pricingAmount}>${serviceFee.toFixed(2)}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingName}>Caddy Fee</Text>
                  <Text style={styles.pricingAmount}>${caddyFee.toFixed(2)}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingName}>Taxes & Fees</Text>
                  <Text style={styles.pricingAmount}>${taxesAndFees.toFixed(2)}</Text>
                </View>
                <View style={[styles.pricingRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Due</Text>
                  <Text style={styles.totalAmount}>${totalDue.toFixed(2)}</Text>
                </View>
              </View>

              <Pressable
                style={[styles.confirmButton, (!selectedTime || !canEditExistingBooking) && styles.confirmButtonDisabled]}
                onPress={handleConfirmBooking}
                disabled={!selectedTime || !canEditExistingBooking}
                variant="cta"
              >
                <Text style={styles.confirmButtonText}>{existingBooking ? "Save Changes" : "Confirm Booking"}</Text>
              </Pressable>

              <Text style={styles.policyText}>
                By confirming, you agree to our 24-hour cancellation policy and course etiquette guidelines.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const themedStyles = createThemedStyleSheet((colors) => ({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 160,
    gap: 14,
  },
  heroSection: {
    height: 214,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlayStrong,
  },
  heroContent: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 18,
  },
  heroKicker: {
    color: "#D8AB5C",
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 1.2,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroLocation: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "500",
  },
  section: {
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
  },
  sectionMeta: {
    color: colors.textSoft,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    letterSpacing: 1,
    fontWeight: "700",
  },
  weatherStateText: {
    color: colors.textSoft,
    fontSize: theme.typography.bodySm.fontSize,
    lineHeight: theme.typography.bodySm.lineHeight,
    fontWeight: "500",
  },
  weatherRow: {
    gap: 10,
    paddingRight: 8,
  },
  weatherCard: {
    width: 78,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceTint,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 4,
  },
  weatherCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  weatherDate: {
    color: colors.text,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
  },
  weatherIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  weatherTemp: {
    color: colors.primary,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
  },
  weatherMinTemp: {
    color: colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "600",
  },
  calendarQuickButton: {
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.surfaceTint,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calendarQuickButtonText: {
    color: colors.primary,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  inlinePickerWrap: {
    borderRadius: 12,
    backgroundColor: colors.surfaceTint,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  inlinePickerDoneButton: {
    height: 36,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  inlinePickerDoneButtonText: {
    color: colors.primary,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
    fontWeight: "700",
  },
  dateRow: {
    gap: 10,
    paddingRight: 8,
  },
  dateChip: {
    width: 62,
    height: 70,
    borderRadius: 12,
    backgroundColor: colors.surfaceTint,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  dateChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateChipDay: {
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 1,
    fontWeight: "800",
    color: colors.textSoft,
  },
  dateChipDayActive: {
    color: colors.textOnPrimaryMuted,
  },
  dateChipDate: {
    color: colors.text,
    fontSize: theme.typography.h2.fontSize,
    lineHeight: theme.typography.h2.lineHeight,
    fontWeight: "900",
  },
  dateChipDateActive: {
    color: colors.surface,
  },
  playersRow: {
    flexDirection: "row",
    gap: 10,
  },
  playerChip: {
    flex: 1,
    height: 50,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  playerChipActive: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accentSoft,
  },
  playerChipText: {
    color: colors.text,
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "800",
  },
  playerChipTextActive: {
    color: colors.accentWarm,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
  },
  periodPill: {
    backgroundColor: colors.surfaceTint,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  periodPillActive: {
    backgroundColor: colors.success,
  },
  periodText: {
    color: colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  periodTextActive: {
    color: colors.successText,
  },
  timeGrid: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeChip: {
    width: "31%",
    height: 40,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  timeChipPast: {
    opacity: 0.4,
  },
  timeChipBooked: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.borderStrong,
    opacity: 1,
  },
  timeChipText: {
    color: colors.text,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
  },
  timeChipTextActive: {
    color: colors.surface,
  },
  timeChipTextDisabled: {
    color: colors.textSoft,
  },
  timeChipTextBooked: {
    color: colors.muted,
  },
  timeChipStrike: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: colors.muted,
    transform: [{ rotate: "-8deg" }],
  },
  summaryCard: {
    marginTop: 2,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryTitle: {
    color: colors.text,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "700",
    marginBottom: 10,
  },
  summaryMetaItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  summaryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  summaryLabel: {
    color: colors.textSoft,
    fontSize: theme.typography.label.fontSize,
    lineHeight: theme.typography.label.lineHeight,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  summaryValue: {
    color: colors.text,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "700",
    marginTop: 1,
  },
  pricingSection: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    gap: 8,
  },
  pricingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pricingName: {
    color: colors.textSoft,
    fontSize: theme.typography.body.fontSize,
    lineHeight: theme.typography.body.lineHeight,
  },
  pricingAmount: {
    color: colors.text,
    fontSize: theme.typography.h3.fontSize,
    lineHeight: theme.typography.h3.lineHeight,
    fontWeight: "800",
  },
  totalRow: {
    marginTop: 6,
  },
  totalLabel: {
    color: colors.text,
    fontSize: theme.typography.title.fontSize,
    lineHeight: theme.typography.title.lineHeight,
    fontWeight: "800",
  },
  totalAmount: {
    color: colors.primary,
    fontSize: theme.typography.h1.fontSize,
    lineHeight: theme.typography.h1.lineHeight,
    fontWeight: "900",
  },
  confirmButton: {
    marginTop: 16,
    height: 54,
    borderRadius: theme.radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: colors.surface,
    fontSize: theme.typography.subtitle.fontSize,
    lineHeight: theme.typography.subtitle.lineHeight,
    fontWeight: "800",
  },
  policyText: {
    marginTop: 14,
    textAlign: "center",
    color: colors.textSoft,
    fontSize: theme.typography.caption.fontSize,
    lineHeight: theme.typography.caption.lineHeight + 4,
    fontWeight: "500",
    paddingHorizontal: 8,
  },
  desktopLayoutRow: {
    flexDirection: "row",
    gap: 24,
    width: "100%",
    alignItems: "flex-start",
  },
  desktopColumnLeft: {
    flex: 1.2,
    gap: 16,
  },
  desktopColumnRight: {
    flex: 1,
    gap: 16,
  },
}));
