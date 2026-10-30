import React, { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import SingleTransaction from "./components/SingleTransaction";
import BatchAnalysis from "./components/BatchAnalysis";
import Results from "./components/Results";
import ModelInfo from "./components/ModelInfo";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);

  const handleSaveBatchResults = (batchData) => {
    setAnalysisResults(batchData);
  };

  const handleSaveSingleResult = (singleItem) => {
    // If we have existing results, prepend the single item; otherwise create new results container
    if (analysisResults && analysisResults.results) {
      const updatedResults = [singleItem, ...analysisResults.results];
      const potCount = updatedResults.filter((r) => r.is_anomaly).length;
      const normCount = updatedResults.length - potCount;

      setAnalysisResults({
        summary: {
          transactions_analyzed: updatedResults.length,
          potential_anomalies: potCount,
          normal_transactions: normCount,
          anomaly_rate: potCount / updatedResults.length,
          has_ground_truth: updatedResults.some((r) => r.actual_class !== undefined),
        },
        results: updatedResults,
      });
    } else {
      setAnalysisResults({
        summary: {
          transactions_analyzed: 1,
          potential_anomalies: singleItem.is_anomaly ? 1 : 0,
          normal_transactions: singleItem.is_anomaly ? 0 : 1,
          anomaly_rate: singleItem.is_anomaly ? 1.0 : 0.0,
          has_ground_truth: singleItem.actual_class !== undefined,
        },
        results: [singleItem],
      });
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="app-container">
          {/* Left Sidebar */}
          <Sidebar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />

          {/* Main Content Area */}
          <div className="main-content">
            <Header activeTab={activeTab} setIsSidebarOpen={setIsSidebarOpen} />

            <main>
              {activeTab === "dashboard" && (
                <Dashboard
                  onNavigateToSingle={() => setActiveTab("single")}
                  onNavigateToBatch={() => setActiveTab("batch")}
                />
              )}

              {activeTab === "single" && (
                <SingleTransaction onSaveResult={handleSaveSingleResult} />
              )}

              {activeTab === "batch" && (
                <BatchAnalysis onSaveBatchResults={handleSaveBatchResults} />
              )}

              {activeTab === "results" && (
                <Results
                  analysisResults={analysisResults}
                  onNavigateToSingle={() => setActiveTab("single")}
                  onNavigateToBatch={() => setActiveTab("batch")}
                />
              )}

              {activeTab === "model" && <ModelInfo />}
            </main>
          </div>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
