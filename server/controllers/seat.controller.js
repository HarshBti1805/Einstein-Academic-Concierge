import prisma from "../db.js";

export const getSeatConfig = async (req, res) => {
    try {
        const { courseId } = req.params;
        const config = await prisma.seatConfig.findUnique({
            where: { courseId: courseId }
        });
        
        if (!config) {
             // Return default or empty if not found, or 404
             return res.status(404).json({ message: "Seat config not found" });
        }
        
        // Return in format expected by client
        res.json(config);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}

export const bookSeat = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { seatNumber } = req.body;
        
        const config = await prisma.seatConfig.findUnique({
            where: { courseId: courseId }
        });
        
        if (!config) {
            return res.status(404).json({ message: "Course not found" });
        }
        
        if (config.occupiedSeats.includes(seatNumber)) {
            return res.status(400).json({ message: "Seat already occupied" });
        }
        
        const updatedConfig = await prisma.seatConfig.update({
            where: { courseId: courseId },
            data: {
                occupiedSeats: {
                    push: seatNumber
                }
            }
        });
        
        res.json(updatedConfig);
    } catch (error) {
        console.error(error);
         res.status(500).json({ message: "Server error" });
    }
}
