"use client";

import { useEffect, useState, useRef } from "react";
import styles from "/styles/clientHome.module.css";

type FormRow = {
    date: string;
    timeIn: string;
    timeOut: string;
    signature: string;
    evaluation: string;
    itp: string;
    isSaved?: boolean; // Track if this row has been saved to database
};

// Signature Canvas Component
const SignatureCanvas = ({
    value,
    onChange,
    index,
    disabled = false
}: {
    value: string;
    onChange: (index: number, field: keyof FormRow, value: string | boolean) => void;
    index: number;
    disabled?: boolean;
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get the actual displayed size of the canvas
        const rect = canvas.getBoundingClientRect();
        const displayWidth = rect.width;
        const displayHeight = rect.height;

        // Set canvas internal size to match display size
        canvas.width = displayWidth;
        canvas.height = displayHeight;

        // Set drawing styles
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Clear canvas with white background
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Load existing signature if any
        if (value && value.startsWith('data:image')) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#fff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = value;
        }
    }, [value]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };

        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    };

    const startDrawing = (pos: { x: number; y: number }) => {
        if (disabled) return;
        setIsDrawing(true);
        setLastPos(pos);
    };

    const draw = (pos: { x: number; y: number }) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();

        setLastPos(pos);
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        // Save the signature as base64
        const canvas = canvasRef.current;
        if (canvas) {
            const dataURL = canvas.toDataURL('image/png');
            onChange(index, 'signature', dataURL);
        }
    };

    const clearSignature = () => {
        if (disabled) return;
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx || !canvas) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        onChange(index, 'signature', '');
    };

    return (
        <div className={styles.signatureContainer}>
            <canvas
                ref={canvasRef}
                className={`${styles.signatureCanvas} ${disabled ? styles.signatureCanvasDisabled : ''}`}
                onMouseDown={(e) => startDrawing(getMousePos(e))}
                onMouseMove={(e) => draw(getMousePos(e))}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={(e) => {
                    e.preventDefault();
                    startDrawing(getTouchPos(e));
                }}
                onTouchMove={(e) => {
                    e.preventDefault();
                    draw(getTouchPos(e));
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    stopDrawing();
                }}
            />
            {!disabled && (
                <button
                    type="button"
                    onClick={clearSignature}
                    className={styles.clearSignatureButton}
                >
                    Clear
                </button>
            )}
        </div>
    );
};

export default function SignatureLog() {
    const [formData, setFormData] = useState<FormRow[]>([
        { date: "", timeIn: "", timeOut: "", signature: "", evaluation: "", itp: "", isSaved: false },
    ]);
    const [patientName, setPatientName] = useState("");
    const [dob, setDob] = useState("");
    const [statusMsg, setStatusMsg] = useState("");
    const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

    // 🔐 Secure hashing (SHA-256, hex output)
    async function hashString(str: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        return Array.from(new Uint8Array(hashBuffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }

    useEffect(() => {
        const savedName = sessionStorage.getItem("patientName");
        const savedDob = sessionStorage.getItem("dob");

        if (savedName) {
            setPatientName(savedName);
            setDob(savedDob || "");
            setTimeout(() => {
                searchOrCreatePatient(savedName, savedDob || "");
                sessionStorage.removeItem("patientName");
                sessionStorage.removeItem("dob");
            }, 100);
        }
    }, []);

    const handleChange = (index: number, field: keyof FormRow, value: string | boolean) => {
        const newFormData = [...formData];
        (newFormData[index] as any)[field] = value;
        setFormData(newFormData);
        setSelectedRowIndex(index);
    };

    const addRow = () => {
        setFormData([
            ...formData,
            { date: "", timeIn: "", timeOut: "", signature: "", evaluation: "", itp: "", isSaved: false },
        ]);
    };

    const searchOrCreatePatient = async (overrideName?: string, overrideDob?: string) => {
        const plainName = overrideName ?? patientName;
        const plainDob = overrideDob ?? dob;

        const hashedName = await hashString(plainName);
        const hashedDob = await hashString(plainDob);

        const res = await fetch("/api/login/patient", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientName: hashedName, dob: hashedDob }),
        });

        const data = await res.json();
        if (res.ok) {
            // Mark all loaded entries as saved
            const savedEntries = (data.entries || []).map((entry: FormRow) => ({
                ...entry,
                isSaved: true
            }));
            setFormData(savedEntries);
            setDob(plainDob); // Keep UI readable
            setStatusMsg(`Loaded patient record for ${plainName}`);
        } else {
            setStatusMsg(data.message || "Failed to load patient");
        }
    };

    const appendData = async () => {
        const hashedName = await hashString(patientName);
        const hashedDob = await hashString(dob);

        // Only send unsaved entries to be appended
        const unsavedEntries = formData.filter(row => !row.isSaved);

        if (unsavedEntries.length === 0) {
            setStatusMsg("No new data to save");
            return;
        }

        const res = await fetch("/api/login/patient/append", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                patientName: hashedName,
                dob: hashedDob,
                newEntries: unsavedEntries,
            }),
        });

        const data = await res.json();

        if (res.ok) {
            // Mark all entries as saved
            const updatedFormData = formData.map(row => ({
                ...row,
                isSaved: true
            }));
            setFormData(updatedFormData);
            setStatusMsg("Data saved successfully");
        } else {
            setStatusMsg(data.message || "Failed to save data");
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.logo}>
                <img src="/logo.png" alt="Logo" className={styles.logoImage} />
            </div>

            <h1 className={styles.heading}>Walker PT & Wellness Parent Signature Log</h1>

            <div className={styles.patientInfo}>
                <label>Patient Name:</label>
                <input
                    type="text"
                    placeholder="Enter patient's name"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                />
                <button onClick={() => searchOrCreatePatient()}>Search</button>
                <label style={{ marginLeft: "1rem" }}>DOB:</label>
                <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                />
            </div>

            <div className={styles.tableContainer}>
                <div className={`${styles.tableGrid} ${styles.tableHeader}`}>
                    <div>Date</div>
                    <div>Time In</div>
                    <div>Time Out</div>
                    <div>Parent Signature</div>
                    <div>Evaluation</div>
                    <div>ITP</div>
                </div>

                {formData.map((row, index) => (
                    <div key={index}>
                        {/* Desktop/Tablet Grid Layout */}
                        <div className={`${styles.tableGrid} ${row.isSaved ? styles.savedRow : ''}`}>
                            <input
                                type="date"
                                value={row.date}
                                onChange={(e) => handleChange(index, "date", e.target.value)}
                                disabled={row.isSaved}
                            />
                            <input
                                type="time"
                                value={row.timeIn}
                                onChange={(e) => handleChange(index, "timeIn", e.target.value)}
                                disabled={row.isSaved}
                            />
                            <input
                                type="time"
                                value={row.timeOut}
                                onChange={(e) => handleChange(index, "timeOut", e.target.value)}
                                disabled={row.isSaved}
                            />
                            <SignatureCanvas
                                value={row.signature}
                                onChange={handleChange}
                                index={index}
                                disabled={row.isSaved}
                            />
                            <input
                                type="text"
                                value={row.evaluation}
                                onChange={(e) => handleChange(index, "evaluation", e.target.value)}
                                disabled={row.isSaved}
                            />
                            <input
                                type="text"
                                value={row.itp}
                                onChange={(e) => handleChange(index, "itp", e.target.value)}
                                disabled={row.isSaved}
                            />
                        </div>

                        {/* Mobile Card Layout */}
                        <div className={`${styles.mobileRow} ${row.isSaved ? styles.savedRow : ''}`}>
                            <div className={styles.mobileRowField}>
                                <label>Date</label>
                                <input
                                    type="date"
                                    value={row.date}
                                    onChange={(e) => handleChange(index, "date", e.target.value)}
                                    disabled={row.isSaved}
                                />
                            </div>
                            <div className={styles.mobileRowField}>
                                <label>Time In</label>
                                <input
                                    type="time"
                                    value={row.timeIn}
                                    onChange={(e) => handleChange(index, "timeIn", e.target.value)}
                                    disabled={row.isSaved}
                                />
                            </div>
                            <div className={styles.mobileRowField}>
                                <label>Time Out</label>
                                <input
                                    type="time"
                                    value={row.timeOut}
                                    onChange={(e) => handleChange(index, "timeOut", e.target.value)}
                                    disabled={row.isSaved}
                                />
                            </div>
                            <div className={styles.mobileRowField}>
                                <label>Parent Signature</label>
                                <SignatureCanvas
                                    value={row.signature}
                                    onChange={handleChange}
                                    index={index}
                                    disabled={row.isSaved}
                                />
                            </div>
                            <div className={styles.mobileRowField}>
                                <label>Evaluation</label>
                                <input
                                    type="text"
                                    value={row.evaluation}
                                    onChange={(e) => handleChange(index, "evaluation", e.target.value)}
                                    disabled={row.isSaved}
                                />
                            </div>
                            <div className={styles.mobileRowField}>
                                <label>ITP</label>
                                <input
                                    type="text"
                                    value={row.itp}
                                    onChange={(e) => handleChange(index, "itp", e.target.value)}
                                    disabled={row.isSaved}
                                />
                            </div>
                        </div>
                    </div>
                ))}

                <button onClick={addRow} className={styles.addRowButton}>
                    + Add Row
                </button>
                <button onClick={appendData} className={styles.addRowButton}>
                    Save Data
                </button>
            </div>

            {statusMsg && <p>{statusMsg}</p>}
        </div>
    );
}