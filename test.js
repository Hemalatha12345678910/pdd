const apiUrl = 'https://polite-suits-melt.loca.lt/analyze';
fetch(apiUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Bypass-Tunnel-Reminder": "true"
  },
  body: JSON.stringify({
    image: "test",
    role: "doctor"
  })
}).then(res => res.text()).then(text => console.log(text)).catch(err => console.error(err));
