"use client";

import { useState, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { useId } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Import react-window for virtualization
import { FixedSizeList as List } from "react-window";

export interface Contact {
  id: string;
  name: string;
  number: string;
  hasCountryCode: boolean;
}

interface CSVImporterProps {
  onImportContacts: (contacts: Contact[]) => void;
}

export default function CSVImporter({ onImportContacts }: CSVImporterProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [csvData, setCsvData] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [nameColumn, setNameColumn] = useState<string | undefined>();
  const [numberColumn, setNumberColumn] = useState<string | undefined>();
  const [defaultCountryCode, setDefaultCountryCode] = useState("+1");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const { toast } = useToast();

  // Validate if a phone number has a country code
  const hasCountryCode = useCallback(
    (number: string): boolean => /^\+\d/.test(number.trim()),
    []
  );

  // Handle file upload
  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Feedback on large files
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Very large file detected",
          description:
            "This file is extremely large. Processing may take some time.",
          variant: "destructive",
          duration: 10000,
        });
      } else if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "Large file detected",
          description: "Processing large file, this may take a moment...",
          duration: 5000,
        });
      } else if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Processing file",
          description: "Please wait while we process your data...",
        });
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvText = event.target?.result as string;
          Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            delimitersToGuess: [",", "\t", ";", "|"],
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                const headers = (results.meta.fields || [])
                  .map((header) => header?.trim())
                  .filter((header) => header && header !== "");
                setHeaders(headers);

                const dataRows = results.data as Record<string, unknown>[];
                setCsvData(dataRows);

                // Auto-detect columns
                const nameCol = headers.find((h) =>
                  ["name", "contact"].some((kw) =>
                    h.toLowerCase().includes(kw)
                  )
                );
                const numberCol = headers.find((h) =>
                  ["phone", "mobile", "no.", "number", "cell"].some((kw) =>
                    h.toLowerCase().includes(kw)
                  )
                );
                setNameColumn(nameCol);
                setNumberColumn(numberCol);

                setIsDialogOpen(true);
              } else {
                toast({
                  title: "Empty file",
                  description: "The CSV file appears to be empty",
                  variant: "destructive",
                });
              }
            },
            error: (error: unknown) => {
              toast({
                title: "File error",
                description:
                  "Could not parse the CSV file. Please check the format.",
                variant: "destructive",
              });
            },
          });
        } catch {
          toast({
            title: "File error",
            description: "Could not read the file.",
            variant: "destructive",
          });
        }
      };
      reader.onerror = () => {
        toast({
          title: "File error",
          description: "Failed to read the file",
          variant: "destructive",
        });
      };
      reader.readAsText(file);
    },
    [toast]
  );

  // Memoized filtered data
  const filteredData = useMemo(() => {
    if (csvData.length > 0 && nameColumn) {
      return csvData.filter((row) => row[nameColumn] !== undefined);
    }
    return [];
  }, [csvData, nameColumn]);

  // Country code application
  const applyCountryCodeToAll = useCallback(() => {
    requestAnimationFrame(() => {
      const updatedData = csvData.map((row) => {
        if (numberColumn && row[numberColumn] !== undefined) {
          const number = String(row[numberColumn] || "").trim();
          if (!hasCountryCode(number)) {
            const phoneNumber = number.replace(/[^0-9]/g, "");
            row[numberColumn] = defaultCountryCode.startsWith("+")
              ? `${defaultCountryCode}${phoneNumber}`
              : `+${defaultCountryCode}${phoneNumber}`;
          }
        }
        return row;
      });
      setCsvData(updatedData);
      toast({
        title: "Country code applied",
        description: `Applied ${defaultCountryCode} to all phone numbers missing country codes`,
      });
    });
  }, [csvData, numberColumn, defaultCountryCode, hasCountryCode, toast]);

  // Import contacts
  const importContacts = useCallback(() => {
    if (!nameColumn || !numberColumn) {
      toast({
        title: "Missing columns",
        description: "Please select both name and phone number columns",
        variant: "destructive",
      });
      return;
    }
    const countryCodeColumn = headers.find(
      (header) =>
        header.toLowerCase().includes("country") &&
        header.toLowerCase().includes("code")
    );
    const newContacts = filteredData
      .map((row) => {
        const name = String(row[nameColumn] || "").trim();
        let number = String(row[numberColumn] || "").trim();
        if (countryCodeColumn && row[countryCodeColumn] !== undefined) {
          const countryCode = String(row[countryCodeColumn] || "")
            .trim()
            .replace(/[^0-9+]/g, "");
          const phoneNumber = number.replace(/[^0-9]/g, "");
          if (countryCode) {
            number = countryCode.startsWith("+")
              ? `${countryCode}${phoneNumber}`
              : `+${countryCode}${phoneNumber}`;
          }
        } else if (!hasCountryCode(number) && defaultCountryCode) {
          const phoneNumber = number.replace(/[^0-9]/g, "");
          number = defaultCountryCode.startsWith("+")
            ? `${defaultCountryCode}${phoneNumber}`
            : `+${defaultCountryCode}${phoneNumber}`;
        }
        return {
          id:
            Date.now().toString() + Math.random().toString(36).substring(2, 9),
          name,
          number,
          hasCountryCode: hasCountryCode(number),
        };
      })
      .filter((contact) => contact.name && contact.number);

    if (newContacts.length === 0) {
      toast({
        title: "No valid contacts",
        description: "The file doesn't contain any valid contacts",
        variant: "destructive",
      });
      return;
    }
    const missing = newContacts.filter((contact) => !contact.hasCountryCode);
    onImportContacts(newContacts);
    setIsDialogOpen(false);
    toast({
      title: "Import successful",
      description: `Imported ${newContacts.length} contacts.${missing.length > 0 ? " Some contacts are missing country codes." : ""}`,
      ...(missing.length > 0 ? { variant: "default" } : {}),
    });
    if (missing.length > 0) {
      setTimeout(() => {
        toast({
          title: "Country Codes Required",
          description: `${missing.length} contacts need country codes.`,
          variant: "destructive",
        });
      }, 1000);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [
    nameColumn,
    numberColumn,
    headers,
    filteredData,
    hasCountryCode,
    defaultCountryCode,
    onImportContacts,
    toast,
  ]);

  // Virtualized row renderer for react-window style
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const row = filteredData[index];
    return (
      <div
        style={{
          ...style,
          display: "flex",
          borderBottom: "1px solid #eee",
          background: index % 2 === 0 ? "#fafbfc" : "#fff",
        }}
        key={`row-${index}-${id}`}
      >
        {headers.map((header, colIndex) => {
          const hasError =
            header === numberColumn && !hasCountryCode(String(row[header] || ""));
          const isSpecialColumn = header === nameColumn || header === numberColumn;
          return (
            <div
              key={`cell-${index}-${colIndex}-${id}`}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "6px 8px",
                whiteSpace: "nowrap",
                background: hasError
                  ? "#ffe6e6"
                  : isSpecialColumn
                  ? "#e8f3ff"
                  : undefined,
                color: hasError ? "#d32f2f" : undefined,
              }}
            >
              {row[header] !== undefined ? String(row[header]) : "-"}
              {header === numberColumn &&
                row[header] !== undefined &&
                !hasCountryCode(String(row[header] || "")) && (
                  <div className="flex flex-col gap-1 mt-1">
                    <span style={{ color: "#d32f2f", fontSize: "12px" }}>
                      Missing country code
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <Input
                        placeholder="+1"
                        className="h-6 w-20 text-xs min-w-[60px]"
                        onChange={(e) => {
                          const countryCode = e.target.value;
                          if (countryCode && row[header]) {
                            const phoneNumber = String(row[header]).replace(/[^0-9]/g, "");
                            row[header] = countryCode.startsWith("+")
                              ? `${countryCode}${phoneNumber}`
                              : `+${countryCode}${phoneNumber}`;
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 text-xs px-2 whitespace-nowrap"
                        onClick={() => setCsvData([...csvData])}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* CSV Uploader UI */}
      <div className="flex flex-col sm:flex-row items-center gap-4 p-5 bg-primary/5 rounded-lg border border-primary/10">
        <div className="shrink-0 p-3 bg-primary/10 rounded-full">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="font-medium text-gray-900">Import Contacts from CSV</h3>
          <p className="text-sm text-gray-600 mt-1">
            Upload a CSV file to import multiple contacts at once. Make sure phone numbers include country codes (e.g., +1).
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
            id="csv-upload"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Upload CSV
          </Button>
        </div>
      </div>

      {/* CSV Import Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl w-full p-6 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              Select which columns to use for contact names and phone numbers. Make sure phone numbers include country codes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 w-full overflow-y-auto">
            {filteredData.length > 1000 && (
              <Alert className="bg-blue-50 border-blue-200 py-3 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <AlertTitle className="text-blue-600 text-sm font-medium">
                    Large Dataset Detected ({filteredData.length.toLocaleString()} rows)
                  </AlertTitle>
                  <AlertDescription className="text-blue-700 text-xs">
                    This table is virtualized for performance. You can scroll through all rows instantly.
                  </AlertDescription>
                </div>
              </Alert>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="flex-1">
                  <Label htmlFor="default-country-code" className="text-sm font-medium text-blue-700 mb-1 block">
                    Default Country Code
                  </Label>
                  <div className="text-xs text-blue-600 mb-2">
                    Set a default country code to apply to all phone numbers missing one
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id="default-country-code"
                    value={defaultCountryCode}
                    onChange={(e) => setDefaultCountryCode(e.target.value)}
                    placeholder="+1"
                    className="w-24 h-8"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 bg-blue-100 hover:bg-blue-200 border-blue-200 text-blue-700"
                    onClick={applyCountryCodeToAll}
                  >
                    Apply to All
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              <div>
                <Label htmlFor="name-column" className="mb-2 block">
                  Name Column
                </Label>
                <Select value={nameColumn} onValueChange={setNameColumn}>
                  <SelectTrigger id="name-column">
                    <SelectValue placeholder="Select column for names" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header) => (
                      <SelectItem key={`name-opt-${header}`} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="number-column" className="mb-2 block">
                  Phone Number Column
                </Label>
                <Select value={numberColumn} onValueChange={setNumberColumn}>
                  <SelectTrigger id="number-column">
                    <SelectValue placeholder="Select column for phone numbers" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((header) => (
                      <SelectItem key={`num-opt-${header}`} value={header}>
                        {header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs text-gray-500">
                    Showing {filteredData.length} contacts
                  </div>
                </div>
                {/* Virtualized Table */}
                <div className="border rounded-md overflow-hidden">
                  <div style={{ height: "260px", overflow: "auto", width: "100%" }}>
                    {/* Table Headers */}
                    <div style={{ display: "flex", background: "#e8f3ff", fontWeight: 500 }}>
                      {headers.map((header, index) => (
                        <div
                          key={`header-${index}-${id}`}
                          style={{
                            flex: 1,
                            minWidth: 120,
                            padding: "6px 8px",
                            whiteSpace: "nowrap",
                            background:
                              header === nameColumn || header === numberColumn
                                ? "#ddeeff"
                                : undefined,
                          }}
                        >
                          {header}
                        </div>
                      ))}
                    </div>
                    {/* Virtualized Rows */}
                    <List
                      height={220}
                      itemCount={filteredData.length}
                      itemSize={40}
                      width="100%"
                    >
                      {Row}
                    </List>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-500">
                    Total rows: {filteredData.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0">
            <div className="flex justify-end gap-3 w-full">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={importContacts}
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 min-w-[150px]"
              >
                Import Contacts
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
            }
