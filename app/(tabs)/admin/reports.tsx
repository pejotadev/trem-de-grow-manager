import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  exportToCSV,
  exportToJSON,
  generatePlantReport,
  generateHarvestReport,
  generateDistributionReport,
  generatePatientReport,
  generateWasteReport,
  generateComplianceReport,
  flattenForCSV,
  DateRange,
  PlantReportData,
  HarvestReportData,
  DistributionReportData,
  PatientReportData,
  WasteReportData,
  FullComplianceReport,
} from '../../../utils/exportData';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { DatePicker } from '../../../components/DatePicker';
import { Loading } from '../../../components/Loading';
import { format, subMonths, startOfMonth, endOfMonth, subYears } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type ReportType = 'plants' | 'harvests' | 'distributions' | 'patients' | 'waste' | 'compliance';

interface ReportTypeInfo {
  id: ReportType;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const REPORT_TYPES: ReportTypeInfo[] = [
  {
    id: 'plants',
    title: 'Plants Report',
    description: 'All plants with control numbers, strains, genetics, stages',
    icon: 'leaf',
    color: '#4CAF50',
  },
  {
    id: 'harvests',
    title: 'Harvests Report',
    description: 'Harvest records with weights, purpose, distribution status',
    icon: 'cut',
    color: '#FF9800',
  },
  {
    id: 'distributions',
    title: 'Distributions Report',
    description: 'Distribution records with anonymized patient data',
    icon: 'gift',
    color: '#9C27B0',
  },
  {
    id: 'patients',
    title: 'Patients Report',
    description: 'Anonymized patient registry and prescription status',
    icon: 'medkit',
    color: '#2196F3',
  },
  {
    id: 'waste',
    title: 'Waste Disposal Report',
    description: 'Waste disposal records for compliance',
    icon: 'trash',
    color: '#795548',
  },
  {
    id: 'compliance',
    title: 'Full Compliance Report',
    description: 'Complete audit with all data and traceability',
    icon: 'shield-checkmark',
    color: '#F44336',
  },
];

type AnyReport = PlantReportData | HarvestReportData | DistributionReportData | PatientReportData | WasteReportData | FullComplianceReport;

export default function ReportsScreen() {
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('plants');
  const [startDate, setStartDate] = useState<Date | null>(startOfMonth(subMonths(new Date(), 1)));
  const [endDate, setEndDate] = useState<Date | null>(endOfMonth(new Date()));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<AnyReport | null>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { userData } = useAuth();

  const selectedReportInfo = REPORT_TYPES.find(r => r.id === selectedReportType)!;

  const getDateRange = (): DateRange | undefined => {
    if (startDate && endDate) {
      return {
        startDate: startDate.getTime(),
        endDate: endDate.getTime(),
      };
    }
    return undefined;
  };

  const handleGenerateReport = async () => {
    if (!userData?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setLoading(true);
    setReportData(null);

    try {
      const dateRange = getDateRange();
      let report: AnyReport;

      switch (selectedReportType) {
        case 'plants':
          report = await generatePlantReport(userData.uid, dateRange);
          break;
        case 'harvests':
          report = await generateHarvestReport(userData.uid, dateRange);
          break;
        case 'distributions':
          report = await generateDistributionReport(userData.uid, dateRange);
          break;
        case 'patients':
          report = await generatePatientReport(userData.uid);
          break;
        case 'waste':
          report = await generateWasteReport(userData.uid, dateRange);
          break;
        case 'compliance':
          report = await generateComplianceReport(userData.uid, dateRange);
          break;
        default:
          throw new Error('Invalid report type');
      }

      setReportData(report);
      setPreviewModalVisible(true);
    } catch (error: any) {
      console.error('[Reports] Error generating report:', error);
      Alert.alert('Error', 'Failed to generate report: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!reportData) return;

    setExporting(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      const filename = `${selectedReportType}_report_${timestamp}`;
      
      // Get the appropriate data array for CSV export
      let dataArray: any[] = [];
      
      switch (selectedReportType) {
        case 'plants':
          dataArray = flattenForCSV((reportData as PlantReportData).plants);
          break;
        case 'harvests':
          dataArray = flattenForCSV((reportData as HarvestReportData).harvests);
          break;
        case 'distributions':
          dataArray = flattenForCSV((reportData as DistributionReportData).distributions);
          break;
        case 'patients':
          dataArray = flattenForCSV((reportData as PatientReportData).patients);
          break;
        case 'waste':
          dataArray = flattenForCSV((reportData as WasteReportData).disposals);
          break;
        case 'compliance':
          // For compliance, we export all data as separate sheets conceptually
          // Here we export the summary + plants for CSV
          const compliance = reportData as FullComplianceReport;
          dataArray = [
            { type: 'SUMMARY', ...compliance.summary },
            ...flattenForCSV(compliance.plants.plants).map(p => ({ type: 'PLANT', ...p })),
            ...flattenForCSV(compliance.harvests.harvests).map(h => ({ type: 'HARVEST', ...h })),
            ...flattenForCSV(compliance.distributions.distributions).map(d => ({ type: 'DISTRIBUTION', ...d })),
          ];
          break;
      }

      await exportToCSV(dataArray, filename);
      Alert.alert('Success', 'Report exported to CSV');
    } catch (error: any) {
      console.error('[Reports] Error exporting CSV:', error);
      Alert.alert('Error', 'Failed to export CSV: ' + (error.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const handleExportJSON = async () => {
    if (!reportData) return;

    setExporting(true);
    try {
      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      const filename = `${selectedReportType}_report_${timestamp}`;
      
      await exportToJSON(reportData, filename);
      Alert.alert('Success', 'Report exported to JSON');
    } catch (error: any) {
      console.error('[Reports] Error exporting JSON:', error);
      Alert.alert('Error', 'Failed to export JSON: ' + (error.message || 'Unknown error'));
    } finally {
      setExporting(false);
    }
  };

  const setQuickDateRange = (range: 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear' | 'allTime') => {
    const now = new Date();
    
    switch (range) {
      case 'thisMonth':
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        setStartDate(startOfMonth(lastMonth));
        setEndDate(endOfMonth(lastMonth));
        break;
      case 'last3Months':
        setStartDate(startOfMonth(subMonths(now, 2)));
        setEndDate(endOfMonth(now));
        break;
      case 'thisYear':
        setStartDate(new Date(now.getFullYear(), 0, 1));
        setEndDate(new Date(now.getFullYear(), 11, 31));
        break;
      case 'allTime':
        setStartDate(null);
        setEndDate(null);
        break;
    }
  };

  const renderReportSummary = () => {
    if (!reportData) return null;

    switch (selectedReportType) {
      case 'plants': {
        const data = reportData as PlantReportData;
        return (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.totalPlants}</Text>
              <Text style={styles.summaryLabel}>Total Plants</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Object.keys(data.byStrain).length}</Text>
              <Text style={styles.summaryLabel}>Strains</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{Object.keys(data.byStage).length}</Text>
              <Text style={styles.summaryLabel}>Stages</Text>
            </View>
          </View>
        );
      }
      case 'harvests': {
        const data = reportData as HarvestReportData;
        return (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.totalHarvests}</Text>
              <Text style={styles.summaryLabel}>Harvests</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{(data.totalWetWeight / 1000).toFixed(2)} kg</Text>
              <Text style={styles.summaryLabel}>Wet Weight</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{(data.totalDryWeight / 1000).toFixed(2)} kg</Text>
              <Text style={styles.summaryLabel}>Dry Weight</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{(data.totalDistributed / 1000).toFixed(2)} kg</Text>
              <Text style={styles.summaryLabel}>Distributed</Text>
            </View>
          </View>
        );
      }
      case 'distributions': {
        const data = reportData as DistributionReportData;
        return (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.totalDistributions}</Text>
              <Text style={styles.summaryLabel}>Distributions</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.totalQuantityGrams.toFixed(1)} g</Text>
              <Text style={styles.summaryLabel}>Total Grams</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.totalQuantityMl.toFixed(1)} ml</Text>
              <Text style={styles.summaryLabel}>Total ML</Text>
            </View>
          </View>
        );
      }
      case 'patients': {
        const data = reportData as PatientReportData;
        return (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.totalPatients}</Text>
              <Text style={styles.summaryLabel}>Total Patients</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.byStatus.active || 0}</Text>
              <Text style={styles.summaryLabel}>Active</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.byStatus.inactive || 0}</Text>
              <Text style={styles.summaryLabel}>Inactive</Text>
            </View>
          </View>
        );
      }
      case 'waste': {
        const data = reportData as WasteReportData;
        return (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.totalRecords}</Text>
              <Text style={styles.summaryLabel}>Records</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{(data.totalWeightGrams / 1000).toFixed(2)} kg</Text>
              <Text style={styles.summaryLabel}>Total Weight</Text>
            </View>
          </View>
        );
      }
      case 'compliance': {
        const data = reportData as FullComplianceReport;
        return (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.summary.totalPlants}</Text>
              <Text style={styles.summaryLabel}>Plants</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.summary.totalHarvests}</Text>
              <Text style={styles.summaryLabel}>Harvests</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.summary.totalDistributions}</Text>
              <Text style={styles.summaryLabel}>Distributions</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.summary.totalPatients}</Text>
              <Text style={styles.summaryLabel}>Patients</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.summary.totalExtracts}</Text>
              <Text style={styles.summaryLabel}>Extracts</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{data.summary.totalWasteDisposals}</Text>
              <Text style={styles.summaryLabel}>Waste Records</Text>
            </View>
          </View>
        );
      }
      default:
        return null;
    }
  };

  const renderDataPreview = () => {
    if (!reportData) return null;

    let items: any[] = [];
    let keyField = 'id';

    switch (selectedReportType) {
      case 'plants':
        items = (reportData as PlantReportData).plants.slice(0, 10);
        keyField = 'controlNumber';
        break;
      case 'harvests':
        items = (reportData as HarvestReportData).harvests.slice(0, 10);
        keyField = 'controlNumber';
        break;
      case 'distributions':
        items = (reportData as DistributionReportData).distributions.slice(0, 10);
        keyField = 'distributionNumber';
        break;
      case 'patients':
        items = (reportData as PatientReportData).patients.slice(0, 10);
        keyField = 'id';
        break;
      case 'waste':
        items = (reportData as WasteReportData).disposals.slice(0, 10);
        keyField = 'disposalDate';
        break;
      case 'compliance':
        // Show summary for compliance
        const compliance = reportData as FullComplianceReport;
        return (
          <View style={styles.previewSection}>
            <Text style={styles.previewSectionTitle}>Report Sections</Text>
            <View style={styles.previewItem}>
              <Ionicons name="leaf" size={16} color="#4CAF50" />
              <Text style={styles.previewItemText}>
                {compliance.plants.totalPlants} plants ({Object.keys(compliance.plants.byStrain).length} strains)
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Ionicons name="cut" size={16} color="#FF9800" />
              <Text style={styles.previewItemText}>
                {compliance.harvests.totalHarvests} harvests ({(compliance.harvests.totalDryWeight / 1000).toFixed(2)} kg dry)
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Ionicons name="gift" size={16} color="#9C27B0" />
              <Text style={styles.previewItemText}>
                {compliance.distributions.totalDistributions} distributions
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Ionicons name="medkit" size={16} color="#2196F3" />
              <Text style={styles.previewItemText}>
                {compliance.patients.totalPatients} patients ({compliance.patients.byStatus.active || 0} active)
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Ionicons name="trash" size={16} color="#795548" />
              <Text style={styles.previewItemText}>
                {compliance.waste.totalRecords} waste records ({(compliance.waste.totalWeightGrams / 1000).toFixed(2)} kg)
              </Text>
            </View>
            <View style={styles.previewItem}>
              <Ionicons name="time" size={16} color="#607D8B" />
              <Text style={styles.previewItemText}>
                {compliance.auditLogSummary.recentActions} recent audit entries
              </Text>
            </View>
          </View>
        );
    }

    return (
      <View style={styles.previewSection}>
        <Text style={styles.previewSectionTitle}>Data Preview (first 10 items)</Text>
        {items.map((item, index) => (
          <View key={item[keyField] || index} style={styles.previewItem}>
            <Text style={styles.previewItemNumber}>{index + 1}.</Text>
            <Text style={styles.previewItemText} numberOfLines={1}>
              {JSON.stringify(item).substring(0, 60)}...
            </Text>
          </View>
        ))}
        {items.length === 0 && (
          <Text style={styles.noDataText}>No data for the selected period</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Report Type Selector */}
        <Card>
          <Text style={styles.sectionTitle}>Select Report Type</Text>
          <View style={styles.reportTypeGrid}>
            {REPORT_TYPES.map((report) => {
              const isSelected = selectedReportType === report.id;
              return (
                <TouchableOpacity
                  key={report.id}
                  style={[
                    styles.reportTypeCard,
                    isSelected && styles.reportTypeCardSelected,
                    isSelected && { borderColor: report.color },
                  ]}
                  onPress={() => setSelectedReportType(report.id)}
                >
                  <View style={[styles.reportTypeIcon, { backgroundColor: report.color + '20' }]}>
                    <Ionicons name={report.icon} size={24} color={report.color} />
                  </View>
                  <Text style={[styles.reportTypeTitle, isSelected && { color: report.color }]}>
                    {report.title}
                  </Text>
                  <Text style={styles.reportTypeDescription} numberOfLines={2}>
                    {report.description}
                  </Text>
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: report.color }]}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Date Range */}
        {selectedReportType !== 'patients' && (
          <Card>
            <Text style={styles.sectionTitle}>Date Range</Text>
            
            {/* Quick Filters */}
            <View style={styles.quickFilters}>
              <TouchableOpacity
                style={styles.quickFilter}
                onPress={() => setQuickDateRange('thisMonth')}
              >
                <Text style={styles.quickFilterText}>This Month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickFilter}
                onPress={() => setQuickDateRange('lastMonth')}
              >
                <Text style={styles.quickFilterText}>Last Month</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickFilter}
                onPress={() => setQuickDateRange('last3Months')}
              >
                <Text style={styles.quickFilterText}>Last 3 Months</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickFilter}
                onPress={() => setQuickDateRange('thisYear')}
              >
                <Text style={styles.quickFilterText}>This Year</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickFilter}
                onPress={() => setQuickDateRange('allTime')}
              >
                <Text style={styles.quickFilterText}>All Time</Text>
              </TouchableOpacity>
            </View>

            <DatePicker
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              placeholder="All time"
            />
            <DatePicker
              label="End Date"
              value={endDate}
              onChange={setEndDate}
              placeholder="All time"
              minimumDate={startDate || undefined}
            />
          </Card>
        )}

        {/* Generate Button */}
        <View style={styles.generateSection}>
          <Button
            title={loading ? 'Generating...' : 'Generate Report'}
            onPress={handleGenerateReport}
            disabled={loading}
          />
        </View>

        {/* Info Card */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <View style={[styles.infoIcon, { backgroundColor: selectedReportInfo.color + '20' }]}>
              <Ionicons name={selectedReportInfo.icon} size={20} color={selectedReportInfo.color} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{selectedReportInfo.title}</Text>
              <Text style={styles.infoDescription}>{selectedReportInfo.description}</Text>
            </View>
          </View>
          <View style={styles.infoDetails}>
            <Text style={styles.infoDetailsText}>
              • Export as CSV or JSON format{'\n'}
              • Share via email, messaging, or cloud storage{'\n'}
              • Patient data is anonymized for privacy
            </Text>
          </View>
        </Card>
      </ScrollView>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <Loading message="Generating report..." />
        </View>
      )}

      {/* Preview Modal */}
      <Modal
        visible={previewModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPreviewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: selectedReportInfo.color + '20' }]}>
                <Ionicons name={selectedReportInfo.icon} size={24} color={selectedReportInfo.color} />
              </View>
              <View style={styles.modalHeaderContent}>
                <Text style={styles.modalTitle}>{selectedReportInfo.title}</Text>
                <Text style={styles.modalSubtitle}>
                  Generated: {reportData?.generatedAt || '-'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setPreviewModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {/* Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                {renderReportSummary()}
              </View>

              {/* Data Preview */}
              {renderDataPreview()}
            </ScrollView>

            {/* Export Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.exportButton, styles.exportButtonCSV]}
                onPress={handleExportCSV}
                disabled={exporting}
              >
                <Ionicons name="document-text" size={20} color="#fff" />
                <Text style={styles.exportButtonText}>
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportButton, styles.exportButtonJSON]}
                onPress={handleExportJSON}
                disabled={exporting}
              >
                <Ionicons name="code-slash" size={20} color="#fff" />
                <Text style={styles.exportButtonText}>
                  {exporting ? 'Exporting...' : 'Export JSON'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  // Report Type Selector
  reportTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reportTypeCard: {
    width: '48%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    position: 'relative',
  },
  reportTypeCardSelected: {
    backgroundColor: '#f8f8f8',
  },
  reportTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  reportTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  reportTypeDescription: {
    fontSize: 11,
    color: '#999',
    lineHeight: 14,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quick Filters
  quickFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickFilter: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#e8e8e8',
  },
  quickFilterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  // Generate Section
  generateSection: {
    marginBottom: 16,
  },
  // Info Card
  infoCard: {
    marginBottom: 24,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  infoDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  infoDetails: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  infoDetailsText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  // Loading Overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalHeaderContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  modalClose: {
    padding: 4,
  },
  modalScroll: {
    maxHeight: 400,
    padding: 16,
  },
  // Summary
  summaryCard: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    minWidth: '30%',
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  // Preview
  previewSection: {
    marginBottom: 16,
  },
  previewSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  previewItemNumber: {
    fontSize: 12,
    color: '#999',
    width: 20,
  },
  previewItemText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  noDataText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  // Export Actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  exportButtonCSV: {
    backgroundColor: '#4CAF50',
  },
  exportButtonJSON: {
    backgroundColor: '#2196F3',
  },
  exportButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});



