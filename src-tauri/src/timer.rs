use std::time::Instant;

pub struct Timer {
    start: Instant,
}

impl Timer {
    pub fn new() -> Self {
        Timer {
            start: Instant::now(),
        }
    }

    pub fn lap(&mut self) -> String {
        let elapsed = self.start.elapsed();
        self.start = Instant::now();

        let nanos = elapsed.as_nanos();
        let decimals = format!("{nanos}").len();
        match decimals {
            0..=4 => format!("{} ns", elapsed.as_nanos()),
            5..=7 => format!("{} μs", elapsed.as_micros()),
            8..=10 => format!("{} ms", elapsed.as_millis()),
            _ => format!("{} s", elapsed.as_secs()),
        }
    }
}
