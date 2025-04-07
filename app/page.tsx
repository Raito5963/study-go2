"use client";
import * as React from "react";
import {
    Card,
    Dialog,
    DialogTitle,
    Button,
} from "@mui/material";

interface items {
    title: string;
    description: string;
    url: string;
}

const items: items[] = [
    {
        title: "test",
        description: "test",
        url: "test",
    },
    {
        title: "test2",
        description: "test2",
        url: "test2",
    },
];

interface ImportDialogProps {
    open: boolean;
    onClose: () => void;
}


const Home = () => {
    const [open, setOpen] = React.useState<boolean>(false);
    const handleClickOpen = () => {
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
    };
    
    return (
        <>
            <h1>Study GO</h1>
            <Button
                variant="contained"
                onClick={handleClickOpen}
            >
                インポート
            </Button>
            <Dialog open={open} onClose={handleClose}>
                <DialogTitle>CSVファイルのインポート</DialogTitle>
                <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                const csvData = event.target?.result;
                                console.log(csvData);
                            };
                            reader.readAsText(file);
                        }
                    }}
                />
                <Button
                    variant="contained"
                    onClick={handleClose}
                >
                    キャンセル
                </Button>
                <Button
                    variant="contained"
                    onClick={() => {
                        console.log("Importing...");
                        handleClose();
                    }}
                >
                    インポート
                </Button>
            </Dialog>
            {items.map((item: items) => (
                <Card
                    key={item.url}
                    sx={{
                        margin: "10px",
                        padding: "10px",
                        backgroundColor: "blue",
                    }}
                >
                    <h2>{item.title}</h2>
                    <p>{item.description}</p>
                </Card>
            ))}
        </>
    );
}
export default Home;