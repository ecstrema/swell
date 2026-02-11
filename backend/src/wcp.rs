// WCP (Waveform Control Protocol) Parser
// A simple text-based waveform format for digital signals

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read};

#[derive(Debug, Clone)]
pub struct WcpHeader {
    pub version: String,
    pub timescale: String,
    pub date: String,
}

#[derive(Debug, Clone)]
pub struct WcpSignal {
    pub name: String,
    pub path: String,
    pub width: usize,
    pub signal_type: String,
}

#[derive(Debug, Clone)]
pub struct WcpChange {
    pub time: u64,
    pub signal_id: usize,
    pub value: String,
}

#[derive(Debug)]
pub struct WcpWaveform {
    pub header: WcpHeader,
    pub signals: Vec<WcpSignal>,
    pub changes: Vec<WcpChange>,
}

#[derive(Debug)]
pub enum WcpParseError {
    InvalidFormat(String),
    IoError(String),
    MissingSection(String),
}

impl From<std::io::Error> for WcpParseError {
    fn from(err: std::io::Error) -> Self {
        WcpParseError::IoError(err.to_string())
    }
}

impl std::fmt::Display for WcpParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            WcpParseError::InvalidFormat(msg) => write!(f, "Invalid WCP format: {}", msg),
            WcpParseError::IoError(msg) => write!(f, "IO error: {}", msg),
            WcpParseError::MissingSection(msg) => write!(f, "Missing section: {}", msg),
        }
    }
}

impl std::error::Error for WcpParseError {}

pub fn parse_wcp<R: Read>(reader: R) -> Result<WcpWaveform, WcpParseError> {
    let buf_reader = BufReader::new(reader);
    let lines = buf_reader.lines();
    
    let mut header = None;
    let mut signals = Vec::new();
    let mut changes = Vec::new();
    
    let mut section = None;
    
    for line_result in lines {
        let line = line_result?;
        let line = line.trim();
        
        // Skip empty lines and comments
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        
        // Check for section markers
        match line {
            "HEADER" => {
                section = Some("HEADER");
                continue;
            }
            "END_HEADER" => {
                section = None;
                continue;
            }
            "SIGNALS" => {
                section = Some("SIGNALS");
                continue;
            }
            "END_SIGNALS" => {
                section = None;
                continue;
            }
            "WAVEFORM" => {
                section = Some("WAVEFORM");
                continue;
            }
            "END_WAVEFORM" => {
                section = None;
                continue;
            }
            _ => {}
        }
        
        // Process line based on current section
        match section {
            Some("HEADER") => {
                if header.is_none() {
                    header = Some(WcpHeader {
                        version: String::new(),
                        timescale: String::new(),
                        date: String::new(),
                    });
                }
                
                if let Some(ref mut h) = header {
                    if let Some((key, value)) = line.split_once(':') {
                        let key = key.trim();
                        let value = value.trim();
                        match key {
                            "version" => h.version = value.to_string(),
                            "timescale" => h.timescale = value.to_string(),
                            "date" => h.date = value.to_string(),
                            _ => {}
                        }
                    }
                }
            }
            Some("SIGNALS") => {
                // Format: sig1: /top/clk width:1 type:wire
                if let Some((sig_id, rest)) = line.split_once(':') {
                    let sig_id = sig_id.trim();
                    let parts: Vec<&str> = rest.split_whitespace().collect();
                    
                    if parts.is_empty() {
                        continue;
                    }
                    
                    let path = parts[0].to_string();
                    let mut width = 1;
                    let mut signal_type = "wire".to_string();
                    
                    for part in &parts[1..] {
                        if let Some((key, value)) = part.split_once(':') {
                            match key {
                                "width" => {
                                    width = value.parse().unwrap_or(1);
                                }
                                "type" => {
                                    signal_type = value.to_string();
                                }
                                _ => {}
                            }
                        }
                    }
                    
                    signals.push(WcpSignal {
                        name: sig_id.to_string(),
                        path,
                        width,
                        signal_type,
                    });
                }
            }
            Some("WAVEFORM") => {
                // Format: 0: sig1=0, sig2=00
                if let Some((time_str, values_str)) = line.split_once(':') {
                    let time: u64 = time_str.trim().parse()
                        .map_err(|_| WcpParseError::InvalidFormat(format!("Invalid time: {}", time_str)))?;
                    
                    // Split by comma for multiple signal changes at same time
                    for change_str in values_str.split(',') {
                        let change_str = change_str.trim();
                        if let Some((sig_name, value)) = change_str.split_once('=') {
                            let sig_name = sig_name.trim();
                            let value = value.trim();
                            
                            // Find signal ID
                            if let Some(sig_idx) = signals.iter().position(|s| s.name == sig_name) {
                                changes.push(WcpChange {
                                    time,
                                    signal_id: sig_idx,
                                    value: value.to_string(),
                                });
                            }
                        }
                    }
                }
            }
            None => {
                // Outside any section, ignore
            }
            _ => {}
        }
    }
    
    let header = header.ok_or(WcpParseError::MissingSection("HEADER".to_string()))?;
    
    if signals.is_empty() {
        return Err(WcpParseError::MissingSection("SIGNALS".to_string()));
    }
    
    Ok(WcpWaveform {
        header,
        signals,
        changes,
    })
}

/// Convert WCP waveform to VCD format
/// This allows us to use the existing wellen parser infrastructure
pub fn wcp_to_vcd(wcp: &WcpWaveform) -> String {
    let mut vcd = String::new();
    
    // VCD header
    vcd.push_str("$date\n");
    vcd.push_str(&format!("   {}\n", wcp.header.date));
    vcd.push_str("$end\n");
    
    vcd.push_str("$version\n");
    vcd.push_str(&format!("   WCP {}\n", wcp.header.version));
    vcd.push_str("$end\n");
    
    vcd.push_str("$timescale ");
    vcd.push_str(&wcp.header.timescale);
    vcd.push_str(" $end\n");
    
    // Build scope hierarchy from signal paths
    let mut scopes: HashMap<String, Vec<usize>> = HashMap::new();
    for (idx, signal) in wcp.signals.iter().enumerate() {
        let parts: Vec<&str> = signal.path.split('/').collect();
        if parts.len() > 1 {
            let scope_path = parts[..parts.len()-1].join("/");
            scopes.entry(scope_path).or_insert_with(Vec::new).push(idx);
        } else {
            scopes.entry(String::new()).or_insert_with(Vec::new).push(idx);
        }
    }
    
    // Generate VCD scopes and var declarations
    for (scope_path, signal_indices) in scopes.iter() {
        let scope_parts: Vec<&str> = scope_path.split('/').filter(|s| !s.is_empty()).collect();
        
        // Open scopes
        for part in &scope_parts {
            vcd.push_str(&format!("$scope module {} $end\n", part));
        }
        
        // Declare variables in this scope
        for &sig_idx in signal_indices {
            let signal = &wcp.signals[sig_idx];
            let sig_name_parts: Vec<&str> = signal.path.split('/').collect();
            let var_name = sig_name_parts.last().map(|s| *s).unwrap_or(&signal.name);
            
            // Generate a unique VCD identifier (using printable ASCII)
            let vcd_id = if sig_idx < 94 {
                // Use single character: ! to ~
                ((sig_idx + 33) as u8 as char).to_string()
            } else {
                // Use multi-character identifiers
                format!("_{}", sig_idx)
            };
            
            vcd.push_str(&format!("$var {} {} {} {} $end\n",
                signal.signal_type,
                signal.width,
                vcd_id,
                var_name
            ));
        }
        
        // Close scopes
        for _ in &scope_parts {
            vcd.push_str("$upscope $end\n");
        }
    }
    
    vcd.push_str("$enddefinitions $end\n");
    
    // Generate VCD value changes
    // Group changes by time
    let mut time_groups: HashMap<u64, Vec<&WcpChange>> = HashMap::new();
    for change in &wcp.changes {
        time_groups.entry(change.time).or_insert_with(Vec::new).push(change);
    }
    
    let mut times: Vec<u64> = time_groups.keys().copied().collect();
    times.sort();
    
    for time in times {
        vcd.push_str(&format!("#{}\n", time));
        
        if let Some(changes) = time_groups.get(&time) {
            for change in changes {
                // Generate VCD identifier for this signal
                let vcd_id = if change.signal_id < 94 {
                    ((change.signal_id + 33) as u8 as char).to_string()
                } else {
                    format!("_{}", change.signal_id)
                };
                
                let signal = &wcp.signals[change.signal_id];
                
                // Format value based on width
                if signal.width == 1 {
                    // Single bit: can use compact format
                    vcd.push_str(&format!("{}{}\n", change.value, vcd_id));
                } else {
                    // Multi-bit: use binary format
                    vcd.push_str(&format!("b{} {}\n", change.value, vcd_id));
                }
            }
        }
    }
    
    vcd
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_simple_wcp() {
        let wcp_data = r#"
# Test WCP file
HEADER
version: 1.0
timescale: 1ns
date: 2026-02-11
END_HEADER

SIGNALS
clk: /top/clk width:1 type:wire
data: /top/data width:8 type:reg
END_SIGNALS

WAVEFORM
0: clk=0, data=00
10: clk=1
20: clk=0, data=FF
30: clk=1
END_WAVEFORM
"#;
        
        let result = parse_wcp(wcp_data.as_bytes());
        assert!(result.is_ok());
        
        let waveform = result.unwrap();
        assert_eq!(waveform.header.version, "1.0");
        assert_eq!(waveform.header.timescale, "1ns");
        assert_eq!(waveform.signals.len(), 2);
        assert_eq!(waveform.signals[0].name, "clk");
        assert_eq!(waveform.signals[1].name, "data");
        assert_eq!(waveform.changes.len(), 6);
    }
    
    #[test]
    fn test_parse_invalid_wcp() {
        let wcp_data = "invalid data";
        let result = parse_wcp(wcp_data.as_bytes());
        assert!(result.is_err());
    }
    
    #[test]
    fn test_wcp_to_vcd_conversion() {
        let wcp_data = r#"
HEADER
version: 1.0
timescale: 1ns
date: 2026-02-11
END_HEADER

SIGNALS
clk: /top/clk width:1 type:wire
data: /top/data width:4 type:reg
END_SIGNALS

WAVEFORM
0: clk=0, data=0000
10: clk=1
20: clk=0, data=1111
END_WAVEFORM
"#;
        
        let waveform = parse_wcp(wcp_data.as_bytes()).unwrap();
        let vcd = wcp_to_vcd(&waveform);
        
        // Check VCD contains required elements
        assert!(vcd.contains("$date"));
        assert!(vcd.contains("$timescale"));
        assert!(vcd.contains("$enddefinitions"));
        assert!(vcd.contains("$var"));
        assert!(vcd.contains("#0"));
        assert!(vcd.contains("#10"));
        assert!(vcd.contains("#20"));
    }
}
